import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Button, Space, Typography, message } from 'antd';
import {
  SettingOutlined,
  ReloadOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store';
import ConnectionStatusComponent from '../components/ConnectionStatus';
import MessageLog from '../components/MessageLog';
import Statistics from '../components/Statistics';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const Main: React.FC = () => {
  const navigate = useNavigate();
  const { connectionStatus, logs, statistics, setStatistics } = useAppStore();
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      const stats = await window.electron.stats.get();
      setStatistics(stats);
    }, 2000);

    return () => clearInterval(interval);
  }, [setStatistics]);

  useEffect(() => {
    const loadInitialLogs = async () => {
      const recentLogs = await window.electron.logs.getRecent(100);
      // setLogs를 사용하여 한 번에 설정 (중복 방지)
      useAppStore.getState().setLogs(recentLogs);
    };

    loadInitialLogs();
  }, []);

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      const result = await window.electron.bridge.reconnect();
      if (result.success) {
        message.success('재연결되었습니다');
      } else {
        message.error(`재연결 실패: ${result.error}`);
      }
    } catch (error) {
      message.error('재연결 중 오류가 발생했습니다');
    } finally {
      setReconnecting(false);
    }
  };

  const handleClearLogs = async () => {
    await window.electron.logs.clear();
    useAppStore.getState().clearLogs();
    message.success('로그가 지워졌습니다');
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 상단 드래그 바 */}
      <div style={{
        height: '36px',
        background: '#f5f5f5',
        WebkitAppRegion: 'drag',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: '80px',
        borderBottom: '1px solid #e0e0e0',
      } as React.CSSProperties}>
        <Title level={5} style={{ margin: 0, color: '#333', fontWeight: 500, fontSize: '14px' }}>
          Claude Slack Bridge
        </Title>
      </div>

      {/* 메인 레이아웃 */}
      <Layout style={{ flex: 1, background: '#fff' }}>
        <Header style={{
          background: '#fff',
          padding: '20px 40px',
          borderBottom: '1px solid #f0f0f0',
          height: 'auto',
          lineHeight: 'normal',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}>
            <Space style={{
              WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}>
              <ConnectionStatusComponent status={connectionStatus} />
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReconnect}
                loading={reconnecting}
                style={{
                  borderRadius: '8px',
                  height: '36px',
                }}
              >
                재연결
              </Button>
              <Button
                icon={<SettingOutlined />}
                onClick={handleSettings}
                style={{
                  borderRadius: '8px',
                  height: '36px',
                }}
              >
                설정
              </Button>
              <Button
                icon={<ClearOutlined />}
                onClick={handleClearLogs}
                style={{
                  borderRadius: '8px',
                  height: '36px',
                }}
              >
                로그 지우기
              </Button>
            </Space>
          </div>
        </Header>

        <Content style={{ padding: '20px 40px', overflow: 'auto', background: '#f5f5f5' }}>
          {/* 로그 영역 */}
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            height: 'calc(100vh - 180px)',
            border: '1px solid #e0e0e0',
          }}>
            <div style={{ color: '#333', fontSize: '18px', marginBottom: '16px', fontWeight: 600 }}>
              실시간 로그
            </div>
            <div style={{ background: '#fafafa', borderRadius: '8px', padding: '16px', height: 'calc(100% - 50px)', overflow: 'auto', border: '1px solid #f0f0f0' }}>
              <MessageLog logs={logs} />
            </div>
          </div>
        </Content>
      </Layout>
    </div>
  );
};

export default Main;
