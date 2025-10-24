import React from 'react';
import { Card, Statistic, Row, Col } from 'antd';
import {
  MessageOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { Statistics as StatsType } from '../../shared/types';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface StatisticsProps {
  statistics: StatsType;
}

const Statistics: React.FC<StatisticsProps> = ({ statistics }) => {
  const formatDuration = (date: Date | null) => {
    if (!date) return '-';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ko });
    } catch {
      return '-';
    }
  };

  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic
            title="메시지 수"
            value={statistics.messageCount}
            prefix={<MessageOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="평균 응답 시간"
            value={statistics.averageResponseTime.toFixed(2)}
            suffix="초"
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="에러 수"
            value={statistics.errorCount}
            prefix={<CloseCircleOutlined />}
            valueStyle={{ color: statistics.errorCount > 0 ? '#cf1322' : undefined }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="세션 시작"
            value={formatDuration(statistics.sessionStartTime)}
            prefix={<PlayCircleOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default Statistics;
