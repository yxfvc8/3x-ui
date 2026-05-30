import { useEffect, useMemo } from 'react';
import {  ConfigProvider, Layout, Modal, message } from 'antd';


import { useTheme } from '@/hooks/useTheme';
import AppSidebar from '@/components/AppSidebar';
import { setMessageInstance } from '@/utils/messageBus';
import { TerminalView } from './TerminalView';

export default function SshPage() {
  const { isDark, isUltra, antdThemeConfig } = useTheme();
  const [modal, modalContextHolder] = Modal.useModal();
  const [messageApi, messageContextHolder] = message.useMessage();
  useEffect(() => { setMessageInstance(messageApi); }, [messageApi]);

   const pageClass = useMemo(() => {
	const classes = ['nodes-page'];
	if (isDark) classes.push('is-dark');
	if (isUltra) classes.push('is-ultra');
	return classes.join(' ');
  }, [isDark, isUltra]);
  return (
	<ConfigProvider theme={antdThemeConfig}>
    {messageContextHolder}
    {modalContextHolder}
    <Layout className={pageClass}>
      <AppSidebar />
      <Layout className="content-shell">
        <Layout.Content id="content-layout" className="content-area" 
		style={{ padding: '16px', display: 'flex',flexDirection: 'column',height: '100vh', boxSizing: 'border-box' }}>
          <div style={{ 
			padding: '16px',
			background: '#000', borderRadius: '8px', 
    overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column'
		}}>
            <TerminalView   />
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  </ConfigProvider>
  );
}
