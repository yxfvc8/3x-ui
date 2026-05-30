import { useEffect, useRef } from 'react';

import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css'; // CSS 路径也可能需要调整


export const TerminalView = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal>(null!);
  const socketRef = useRef<WebSocket | null>(null);
  const currentPath = useRef<string>('')
  const handleDragOver = (e: React.DragEvent) => {
	e.preventDefault(); // 必须：允许放置
  };

  const handleDrop = async (e: React.DragEvent) => {
	e.preventDefault();
	const file = e.dataTransfer.files[0];
	if (!file || !term.current) return;
	term.current.write(`\r\n\x1b[36m[Upload]\x1b[0m Starting: ${file.name}...\r\n`);

    const formData = new FormData();
    formData.append('file', file);
	formData.append('path',currentPath.current);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/ssh/upload', true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        const bar = '='.repeat(Math.floor(percent / 5)) + '-'.repeat(20 - Math.floor(percent / 5));
        term.current.write(`\rUploading: [${bar}] ${percent}%`);
      }
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        term.current.write('\r\n\x1b[32mUpload finished successfully!\x1b[0m\r\n');
      } else {
        term.current.write('\r\n\x1b[31mUpload failed!\x1b[0m\r\n');
      }
    };

    xhr.send(formData);
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    const xterm = new Terminal({ cursorBlink: true,fontSize: 14});
    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(terminalRef.current);
    fitAddon.fit();
    term.current = xterm;

	

	const connect = () => {
		const host = window.location.hostname;
		const currentPort = window.location.port;
		const portPart = host=='localhost'?  ':2053' : (currentPort ? `:${currentPort}` : '');
		const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
		const path = 'ssh';
		const wsUrl = `${protocol}://${host}${portPart}/${path}`;

		const ws = new WebSocket(wsUrl);
		socketRef.current = ws;
		ws.onopen = () => {
			ws.send(JSON.stringify({ 
				type: 'resize', 
				cols: xterm.cols, 
				rows: xterm.rows 
			}));
        };
		ws.onmessage = async (event) => {
			let textData = event.data;
			if (event.data instanceof Blob) {
				textData = await event.data.text();
			}
			try {
				const msg = JSON.parse(textData);
				if(msg.type == 'path'){
					currentPath.current = msg.data;
					console.debug(msg.data);
				}else if(msg.type == 'ssh'){
					if(msg.path)currentPath.current = msg.path;
					xterm.write(msg.data);
				}
			} catch {
			}
		};
		ws.onerror = (error) => {
			xterm.write(`\r\n\x1b[31m[WebSocket Error]\x1b[0m: Failed to connect to server.\r\n`);
			console.error('WebSocket Error:', error);
		};
		ws.onclose = () => {
			xterm.write('\r\n\x1b[33m[Disconnected]\x1b[0m: Attempting to reconnect in 5s...\r\n');
			setTimeout(connect, 5000);
		};
		xterm.onData((data) => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: 'input', data }));
			}
		});
	};

	connect();




	

    const handleResize = () => {
      fitAddon.fit();
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ 
            type: 'resize', 
            cols: xterm.cols, 
            rows: xterm.rows 
        }));
      }
    };
    window.addEventListener('resize', handleResize);


	

    return () => {
	  window.removeEventListener('resize', handleResize);
      xterm.dispose();
    };
  }, []);
  return <div ref={terminalRef} 
  onDragOver={handleDragOver} 
      onDrop={handleDrop}
  style={{ height: '100%', width: '100%' }} />;
};