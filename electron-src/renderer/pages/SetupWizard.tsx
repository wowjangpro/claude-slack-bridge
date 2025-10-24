import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Steps, Button, Form, Input, message, Card, Typography, Space, Tag } from 'antd';
import {
  RocketOutlined,
  KeyOutlined,
  FolderOutlined,
  CheckCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store';
import { AppConfig } from '../../shared/types';

const { Title, Text, Paragraph } = Typography;

const SetupWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const navigate = useNavigate();
  const { setConfig, setSetupComplete } = useAppStore();

  // 저장된 설정 불러오기
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await window.electron.config.get();
        if (config) {
          const initialData = {
            slackBotToken: config.slackBotToken,
            slackAppToken: config.slackAppToken,
            slackSigningSecret: config.slackSigningSecret,
            botUserId: config.botUserId,
            allowedUserIds: config.allowedUserIds.join(', '),
            workspaceDir: config.workspaceDir,
            claudePath: config.claudePath || 'claude',
          };
          setFormData(initialData);
          form.setFieldsValue(initialData);
        }
      } catch (error) {
        console.error('설정 불러오기 실패:', error);
      }
    };
    loadConfig();
  }, [form]);

  const steps = [
    {
      title: '환영합니다',
      icon: <RocketOutlined />,
    },
    {
      title: 'Slack 설정',
      icon: <KeyOutlined />,
    },
    {
      title: '워크스페이스',
      icon: <FolderOutlined />,
    },
    {
      title: '사용자 권한',
      icon: <UserOutlined />,
    },
    {
      title: '완료',
      icon: <CheckCircleOutlined />,
    },
  ];

  const handleNext = async () => {
    if (currentStep === 0) {
      setCurrentStep(1);
      return;
    }

    try {
      // 현재 단계의 필드만 검증하고 저장
      if (currentStep === 1) {
        await form.validateFields(['slackBotToken', 'slackAppToken', 'slackSigningSecret', 'botUserId']);
        const values = form.getFieldsValue(['slackBotToken', 'slackAppToken', 'slackSigningSecret', 'botUserId']);
        setFormData({ ...formData, ...values });
        setCurrentStep(2);
      } else if (currentStep === 2) {
        await form.validateFields(['workspaceDir', 'claudePath']);
        const values = form.getFieldsValue(['workspaceDir', 'claudePath']);
        setFormData({ ...formData, ...values });
        setCurrentStep(3);
      } else if (currentStep === 3) {
        await form.validateFields(['allowedUserIds']);
        const values = form.getFieldsValue(['allowedUserIds']);
        setFormData({ ...formData, ...values });
        setCurrentStep(4);
      } else if (currentStep === 4) {
        setLoading(true);

        try {
          // 저장된 formData 사용
          console.log('저장된 폼 데이터:', formData);

          if (!formData.allowedUserIds || formData.allowedUserIds.trim() === '') {
            throw new Error('허용된 사용자 ID를 입력해주세요');
          }

          const allowedUserIds = formData.allowedUserIds
            .split(',')
            .map((id: string) => id.trim())
            .filter(Boolean);

          if (allowedUserIds.length === 0) {
            throw new Error('최소 1개 이상의 유효한 사용자 ID를 입력해주세요');
          }

          const config: AppConfig = {
            slackBotToken: formData.slackBotToken,
            slackAppToken: formData.slackAppToken,
            slackSigningSecret: formData.slackSigningSecret,
            botUserId: formData.botUserId,
            allowedUserIds,
            workspaceDir: formData.workspaceDir,
            claudePath: formData.claudePath || 'claude',
          };

          console.log('설정 저장 중...', config);
          await window.electron.config.set(config);

          console.log('Slack Bot 시작 중...');
          const result = await window.electron.bridge.start(config);
          console.log('결과:', result);

          if (result.success) {
            message.success('설정이 완료되었습니다!');
            setConfig(config);
            setSetupComplete(true);
            navigate('/main');
          } else {
            message.error(`연결 실패: ${result.error || '알 수 없는 오류'}`);
            setLoading(false);
          }
        } catch (error: any) {
          console.error('설정 완료 중 오류:', error);
          message.error(`오류 발생: ${error?.message || '알 수 없는 오류'}`);
          setLoading(false);
        }
      }
    } catch (error: any) {
      console.error('Validation failed:', error);
      message.error(`입력 검증 실패: ${error?.errorFields?.[0]?.errors?.[0] || '필수 항목을 확인해주세요'}`);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <Card style={{ maxWidth: 800, margin: '0 auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Title level={2}>Claude Slack Bridge에 오신 것을 환영합니다!</Title>
            <Paragraph>
              이 애플리케이션은 Slack과 Claude Code CLI를 연결하여 실시간으로 대화하고 작업할 수 있게 해줍니다.
            </Paragraph>
            <Paragraph>
              설정 마법사를 통해 필요한 정보를 입력하면 바로 사용을 시작할 수 있습니다.
            </Paragraph>
            <Space direction="vertical">
              <Text strong>필요한 것들:</Text>
              <ul>
                <li>Slack Bot Token (xoxb-로 시작)</li>
                <li>Slack App Token (xapp-로 시작)</li>
                <li>Slack Signing Secret</li>
                <li>Bot User ID</li>
                <li>허용할 사용자 ID 목록</li>
                <li>작업할 워크스페이스 경로</li>
              </ul>
            </Space>
          </Space>
        </Card>
      );
    }

    if (currentStep === 1) {
      return (
        <Card style={{ maxWidth: 800, margin: '0 auto' }}>
          <Title level={3}>Slack Bot 설정</Title>
          <Paragraph type="secondary">
            Slack API 설정 페이지(api.slack.com/apps)에서 확인할 수 있습니다.
          </Paragraph>
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
        </Card>
      );
    }

    if (currentStep === 2) {
      return (
        <Card style={{ maxWidth: 800, margin: '0 auto' }}>
          <Title level={3}>워크스페이스 설정</Title>
          <Paragraph type="secondary">
            Claude가 작업할 디렉토리를 지정합니다.
          </Paragraph>
          <Form.Item
            label="작업 디렉토리"
            name="workspaceDir"
            rules={[{ required: true, message: '작업 디렉토리를 입력해주세요' }]}
          >
            <Input placeholder="/Users/username/projects" />
          </Form.Item>

          <Form.Item
            label="Claude CLI 경로 (선택사항)"
            name="claudePath"
            extra="기본값: claude (PATH에 있는 경우 생략 가능)"
          >
            <Input placeholder="claude" />
          </Form.Item>
        </Card>
      );
    }

    if (currentStep === 3) {
      return (
        <Card style={{ maxWidth: 800, margin: '0 auto' }}>
          <Title level={3}>사용자 권한 설정</Title>
          <Paragraph type="secondary">
            봇을 사용할 수 있는 사용자 ID를 지정합니다. (쉼표로 구분)
          </Paragraph>
          <Form.Item
            label="허용된 사용자 ID"
            name="allowedUserIds"
            rules={[{ required: true, message: '최소 1명 이상의 사용자 ID를 입력해주세요' }]}
            extra={
              <Space direction="vertical" style={{ marginTop: 8 }}>
                <Text type="secondary">
                  사용자 ID 또는 DM 채널 ID를 입력할 수 있습니다.
                </Text>
                <Space>
                  <Tag color="blue">U12345ABC</Tag>
                  <Tag color="green">D67890XYZ</Tag>
                </Space>
              </Space>
            }
          >
            <Input.TextArea
              placeholder="U12345ABC, D67890XYZ"
              rows={3}
            />
          </Form.Item>
        </Card>
      );
    }

    if (currentStep === 4) {
      return (
        <Card style={{ maxWidth: 800, margin: '0 auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
            <Title level={2}>모든 준비가 완료되었습니다!</Title>
            <Paragraph>
              완료 버튼을 클릭하면 Slack Bot이 시작되고 메인 화면으로 이동합니다.
            </Paragraph>
            <Paragraph type="secondary">
              설정은 언제든지 설정 화면에서 변경할 수 있습니다.
            </Paragraph>
          </Space>
        </Card>
      );
    }

    return null;
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

      {/* 메인 컨텐츠 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, background: '#fff' }}>
        <Steps current={currentStep} items={steps} style={{ marginBottom: 32 }} />

        <Form form={form} layout="vertical" style={{ flex: 1, overflow: 'auto' }}>
          {renderStepContent()}
        </Form>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <Button onClick={handlePrev} disabled={currentStep === 0} style={{ borderRadius: '8px', height: '40px' }}>
            이전
          </Button>
          <Button type="primary" onClick={handleNext} loading={loading} style={{ borderRadius: '8px', height: '40px' }}>
            {currentStep === steps.length - 1 ? '완료' : '다음'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
