export type DeviceStatus = 'online' | 'offline';

export type DeviceRecord = {
  id: string;
  name: string;
  token: string;
  authorized: boolean;
  blocked: boolean;
  allowedPaths: string[];
  status: DeviceStatus;
  lastSeenAt: string | null;
  lastIp: string | null;
  lastProtocol: string | null;
  currentPath: string | null;
  createdAt: string;
  updatedAt: string;
  notes: string;
};

export type BackendSettings = {
  mediamtxApiUrl: string;
  hlsBaseUrl: string;
  requireDeviceAuth: boolean;
  allowUnknownDevices: boolean;
  autoRegisterUnknownDevices: boolean;
  autoAuthorizeNewDevices: boolean;
  exposeOnlyAuthorizedPaths: boolean;
  maxDevices: number;
  maxConnectedDevices: number;
  deviceOfflineAfterMs: number;
  pollIntervalMs: number;
  enablePublish: boolean;
  enableRead: boolean;
};

export type BackendState = {
  settings: BackendSettings;
  devices: Record<string, DeviceRecord>;
  createdAt: string;
  updatedAt: string;
};
