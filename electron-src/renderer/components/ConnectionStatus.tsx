import React from 'react';
import { Badge, Space, Typography } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { ConnectionStatus as ConnStatus } from '../../shared/types';

const { Text } = Typography;

interface ConnectionStatusProps {
  status: ConnStatus;
}

const ConnectionStatusComponent: React.FC<ConnectionStatusProps> = ({ status }) => {
  const statusConfig = {
    [ConnStatus.DISCONNECTED]: {
      color: 'red',
      text: '연결 안됨',
      icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
    },
    [ConnStatus.CONNECTING]: {
      color: 'orange',
      text: '연결 중...',
      icon: <LoadingOutlined style={{ color: '#faad14' }} />,
    },
    [ConnStatus.CONNECTED]: {
      color: 'green',
      text: '연결됨',
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    },
    [ConnStatus.ERROR]: {
      color: 'red',
      text: '오류',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
    },
  };

  const config = statusConfig[status];

  return (
    <Space>
      {config.icon}
      <Text strong>{config.text}</Text>
    </Space>
  );
};

export default ConnectionStatusComponent;
