import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout,
  Form,
  Input,
  Button,
  Card,
  Typography,
  message,
  Space,
  Modal,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useAppStore } from '../store';
import { AppConfig, ConnectionStatus } from '../../shared/types';

const { Header, Content } = Layout;
const { Title } = Typography;

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { config, setConfig, connectionStatus } = useAppStore();

  useEffect(() => {
    if (config) {
      form.setFieldsValue({
        ...config,
        allowedUserIds: config.allowedUserIds.join(', '),
      });
    }
  }, [config, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      const hasActiveSession = connectionStatus === ConnectionStatus.CONNECTED;

      if (hasActiveSession) {
        Modal.confirm({
          title: '작업 경로 변경 확인',
          content: '현재 진행 중인 작업이 있습니다. 설정을 변경하면 연결이 재시작됩니다. 계속하시겠습니까?',
          okText: '예',
          cancelText: '아니오',
          onOk: async () => {
            await saveConfig(values);
          },
        });
      } else {
        await saveConfig(values);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const saveConfig = async (values: any) => {
    setLoading(true);

    try {
      const newConfig: AppConfig = {
        slackBotToken: values.slackBotToken,
        slackAppToken: values.slackAppToken,
        slackSigningSecret: values.slackSigningSecret,
        botUserId: values.botUserId,
        allowedUserIds: values.allowedUserIds.split(',').map((id: string) => id.trim()),
        workspaceDir: values.workspaceDir,
        claudePath: values.claudePath || 'claude',
      };

      await window.electron.config.set(newConfig);

      if (connectionStatus === ConnectionStatus.CONNECTED) {
        await window.electron.bridge.stop();
        const result = await window.electron.bridge.start(newConfig);

        if (result.success) {
          message.success('설정이 저장되고 재연결되었습니다');
        } else {
          message.error(`재연결 실패: ${result.error}`);
        }
      } else {
        message.success('설정이 저장되었습니다');
      }

      setConfig(newConfig);
    } catch (error: any) {
      message.error(`설정 저장 실패: ${error?.message || '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/main');
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
            alignItems: 'center',
          }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              style={{
                marginRight: 16,
                WebkitAppRegion: 'no-drag',
              } as React.CSSProperties}
            >
              돌아가기
            </Button>
            <Title level={4} style={{ margin: 0, color: '#333' }}>
              설정
            </Title>
          </div>
        </Header>
        <Content style={{ padding: '20px 40px', overflow: 'auto', background: '#f5f5f5' }}>
          <Card style={{
            maxWidth: 800,
            margin: '0 auto',
            borderRadius: '8px',
          }}>
            <Form form={form} layout="vertical">
              <Title level={5} style={{ marginBottom: 24 }}>Slack Bot 설정</Title>
              <Form.Item
                label="Slack Bot Token"
                name="slackBotToken"
                rules={[
                  { required: true, message: 'Bot Token을 입력해주세요' },
                  { pattern: /^xoxb-/, message: 'xoxb-로 시작해야 합니다' },
                ]}
              >
                <Input.Password placeholder="xoxb-..." />
              </Form.Item>

              <Form.Item
                label="Slack App Token"
                name="slackAppToken"
                rules={[
                  { required: true, message: 'App Token을 입력해주세요' },
                  { pattern: /^xapp-/, message: 'xapp-로 시작해야 합니다' },
                ]}
              >
                <Input.Password placeholder="xapp-..." />
              </Form.Item>

              <Form.Item
                label="Slack Signing Secret"
                name="slackSigningSecret"
                rules={[{ required: true, message: 'Signing Secret을 입력해주세요' }]}
              >
                <Input.Password placeholder="Signing Secret" />
              </Form.Item>

              <Form.Item
                label="Bot User ID"
                name="botUserId"
                rules={[{ required: true, message: 'Bot User ID를 입력해주세요' }]}
              >
                <Input placeholder="U09J01W1PCN" />
              </Form.Item>

              <Title level={5} style={{ marginTop: 24 }}>워크스페이스 설정</Title>
              <Form.Item
                label="작업 디렉토리"
                name="workspaceDir"
                rules={[{ required: true, message: '작업 디렉토리를 입력해주세요' }]}
              >
                <Input placeholder="/Users/username/projects" />
              </Form.Item>

              <Form.Item
                label="Claude CLI 경로"
                name="claudePath"
                extra="기본값: claude"
              >
                <Input placeholder="claude" />
              </Form.Item>

              <Title level={5} style={{ marginTop: 24 }}>사용자 권한</Title>
              <Form.Item
                label="허용된 사용자 ID"
                name="allowedUserIds"
                rules={[{ required: true, message: '최소 1명 이상의 사용자 ID를 입력해주세요' }]}
                extra="쉼표로 구분하여 여러 ID 입력 가능"
              >
                <Input.TextArea placeholder="U12345ABC, D67890XYZ" rows={3} />
              </Form.Item>

              <Form.Item style={{ marginTop: 32 }}>
                <Space>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    loading={loading}
                    style={{
                      borderRadius: '8px',
                      height: '40px',
                    }}
                  >
                    저장
                  </Button>
                  <Button
                    onClick={handleBack}
                    style={{
                      borderRadius: '8px',
                      height: '40px',
                    }}
                  >
                    취소
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Content>
      </Layout>
    </div>
  );
};

export default Settings;
