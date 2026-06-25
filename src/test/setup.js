import '@testing-library/jest-dom';

// Mock BroadcastChannel
class MockBroadcastChannel {
  constructor() {
    this.onmessage = null;
  }
  postMessage() {}
  addEventListener() {}
  removeEventListener() {}
  close() {}
}

global.BroadcastChannel = MockBroadcastChannel;

// Mock Notification
class MockNotification {
  constructor() {}
  close() {}
  static permission = 'granted';
  static requestPermission = () => Promise.resolve('granted');
}

global.Notification = MockNotification;

// Mock Audio
class MockAudio {
  constructor() {
    this.volume = 0;
  }
  play() {
    return Promise.resolve();
  }
}

global.Audio = MockAudio;

// Mock window.URL
global.URL.createObjectURL = () => 'mock-url';
global.URL.revokeObjectURL = () => {};
