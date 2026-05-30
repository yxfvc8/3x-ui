package service

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"os"
	"os/exec"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

// SSHService handles SSH connections for web terminal
type SSHService struct {
	//server *gossh.Server
}
type SSHData struct {
	Type string `json:"type"`
	Data string `json:"data"`
	Path string `json:"path"`
	Cols int    `json:"cols"`
	Rows int    `json:"rows"`
}

var (
	cwdPrefix = []byte("\033]777;cwd;")
	cwdSuffix = []byte("\033\\")
)

// NewSSHService creates a new SSH service
func NewSSHService() *SSHService {
	return &SSHService{}
}

func (s *SSHService) handleFromPty(data []byte, ws *websocket.Conn) {
	path := ""
	if idx := bytes.Index(data, cwdPrefix); idx != -1 {
		remaining := data[idx+len(cwdPrefix):]
		if endIdx := bytes.Index(remaining, cwdSuffix); endIdx != -1 {
			path = string(remaining[:endIdx])
			//msg, _ := json.Marshal(map[string]string{"type": "path", "data": path})
			//ws.WriteMessage(websocket.TextMessage, msg)
		}
	}
	wdata, _ := json.Marshal(&SSHData{
		Type: "ssh",
		Data: string(data),
		Path: path,
	})
	ws.WriteMessage(websocket.TextMessage, []byte(wdata))
}

// HandleConnection handles an incoming WebSocket connection and bridges it to SSH
func (s *SSHService) HandleConnection(ws *websocket.Conn, remoteIP string) {
	_, cancel := context.WithCancel(context.Background())
	defer cancel()
	// 1. 启动 Shell 进程 (这里使用 bash)
	cmd := exec.Command("bash")
	cmd.Env = append(os.Environ(), `PROMPT_COMMAND=printf "\033]777;cwd;%s\033\\" "$PWD"`)

	// 2. 使用 pty 开启伪终端 (关键步骤，否则命令无法交互)
	f, err := pty.Start(cmd)
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	// 3. 桥接逻辑
	// 将 pty 输出转发给 websocket
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := f.Read(buf)
			if err != nil {
				return
			}
			s.handleFromPty(buf[:n], ws)
		}
	}()

	// 将 websocket 输入转发给 pty
	for {
		_, msg, err := ws.ReadMessage()
		if err != nil {
			return
		}
		var rdata *SSHData
		if err := json.Unmarshal(msg, &rdata); err == nil {
			switch rdata.Type {
			case "input":
				f.Write([]byte(rdata.Data))
			case "resize":
				if rdata.Cols > 0 && rdata.Rows > 0 {
					winSize := pty.Winsize{Cols: uint16(rdata.Cols), Rows: uint16(rdata.Rows)}
					pty.Setsize(f, &winSize)
				}
			}
		} else {
			f.Write(msg)
		}
	}
}
