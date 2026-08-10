export const NetworkState = {
  isOnline: navigator.onLine,
  listeners: [],

  init() {
    window.addEventListener('online', () => this.update(true));
    window.addEventListener('offline', () => this.update(false));
  },

  update(online) {
    this.isOnline = online;
    this.listeners.forEach(l => l(this.isOnline));
  },

  subscribe(callback) {
    this.listeners.push(callback);
    callback(this.isOnline);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
};

NetworkState.init();
