import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import koKR from 'antd/locale/ko_KR';
import SetupWizard from './pages/SetupWizard';
import Main from './pages/Main';
import Settings from './pages/Settings';
import { useAppStore } from './store';

const App: React.FC = () => {
  const { config, setConfig, setSetupComplete, addLog, setConnectionStatus } = useAppStore();

  useEffect(() => {
    const loadConfig = async () => {
      const savedConfig = await window.electron.config.get();
      if (savedConfig) {
        setConfig(savedConfig);
        setSetupComplete(true);
      }
    };

    loadConfig();

    // 로그 구독 및 cleanup 함수 저장
    const unsubscribe = window.electron.logs.subscribe((log) => {
      addLog(log);
    });

    const statusInterval = setInterval(async () => {
      const status = await window.electron.bridge.getStatus();
      setConnectionStatus(status);
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      unsubscribe(); // 로그 구독 해제
    };
  }, []);

  const isSetupComplete = config !== null;

  return (
    <ConfigProvider
      locale={koKR}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              isSetupComplete ? <Navigate to="/main" replace /> : <Navigate to="/setup" replace />
            }
          />
          <Route
            path="/setup"
            element={
              isSetupComplete ? <Navigate to="/main" replace /> : <SetupWizard />
            }
          />
          <Route
            path="/main"
            element={
              isSetupComplete ? <Main /> : <Navigate to="/setup" replace />
            }
          />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
};

export default App;
