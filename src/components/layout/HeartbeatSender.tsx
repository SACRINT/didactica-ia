'use client';

import { useEffect } from 'react';

export default function HeartbeatSender() {
  useEffect(() => {
    const sendHeartbeat = () => {
      fetch('/api/teacher-profile/heartbeat', { method: 'POST' }).catch(() => {});
    };

    // Send immediately on mount
    sendHeartbeat();

    // Send heartbeat every 3 minutes
    const interval = setInterval(sendHeartbeat, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
