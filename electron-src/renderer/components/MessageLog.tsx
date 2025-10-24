import React, { useEffect, useRef } from 'react';
import { List, Tag, Typography, Space } from 'antd';
import {
  UserOutlined,
  RobotOutlined,
  InfoCircleOutlined,
  ToolOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { LogEntry } from '../../shared/types';
import { format } from 'date-fns';

const { Text } = Typography;

interface MessageLogProps {
  logs: LogEntry[];
}

const MessageLog: React.FC<MessageLogProps> = ({ logs }) => {
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getIconAndColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'user_message':
        return { icon: <UserOutlined />, color: 'blue' };
      case 'claude_message':
        return { icon: <RobotOutlined />, color: 'green' };
      case 'system':
        return { icon: <InfoCircleOutlined />, color: 'default' };
      case 'tool_use':
        return { icon: <ToolOutlined />, color: 'orange' };
      case 'error':
        return { icon: <CloseCircleOutlined />, color: 'red' };
      case 'waiting':
        return { icon: <ClockCircleOutlined />, color: 'gold' };
      default:
        return { icon: <InfoCircleOutlined />, color: 'default' };
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 0 }}>
      <List
        dataSource={logs}
        renderItem={(log) => {
          const { icon, color } = getIconAndColor(log.type);
          return (
            <List.Item
              key={log.id}
              style={{
                borderBottom: '1px solid #f0f0f0',
                padding: '12px 0',
                background: 'transparent',
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Tag color={color} icon={icon}>
                    {log.type.replace('_', ' ').toUpperCase()}
                  </Tag>
                  <Text style={{ fontSize: 12, color: '#999' }}>
                    {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                  </Text>
                </Space>
                <Text style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#333',
                  lineHeight: 1.6,
                }}>
                  {log.content}
                </Text>
              </Space>
            </List.Item>
          );
        }}
      />
      <div ref={listEndRef} />
    </div>
  );
};

export default MessageLog;
