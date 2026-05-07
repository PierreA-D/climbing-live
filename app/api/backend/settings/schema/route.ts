import { NextResponse } from 'next/server';

import { createDefaultSettings } from '@/lib/backend/store';

export const runtime = 'nodejs';

export async function GET() {
  const defaults = createDefaultSettings();

  return NextResponse.json({
    defaults,
    fields: {
      mediamtxApiUrl: {
        type: 'string',
        description: 'Base URL of MediaMTX control API',
      },
      hlsBaseUrl: {
        type: 'string',
        description: 'Base URL used to build HLS playlist links',
      },
      requireDeviceAuth: {
        type: 'boolean',
        description: 'If true, a device must be explicitly authorized',
      },
      allowUnknownDevices: {
        type: 'boolean',
        description: 'Allow requests with unknown device identifiers',
      },
      autoRegisterUnknownDevices: {
        type: 'boolean',
        description: 'Automatically create unknown devices at first connection',
      },
      autoAuthorizeNewDevices: {
        type: 'boolean',
        description: 'Automatically authorize auto-registered devices',
      },
      exposeOnlyAuthorizedPaths: {
        type: 'boolean',
        description: 'If true, only paths assigned to authorized devices are exposed to clients',
      },
      maxDevices: {
        type: 'number',
        description: 'Maximum number of devices in inventory',
      },
      maxConnectedDevices: {
        type: 'number',
        description: 'Maximum simultaneous online devices',
      },
      deviceOfflineAfterMs: {
        type: 'number',
        description: 'Inactivity duration after which a device is considered offline',
      },
      pollIntervalMs: {
        type: 'number',
        description: 'Recommended polling interval for clients',
      },
      enablePublish: {
        type: 'boolean',
        description: 'Allow publish actions',
      },
      enableRead: {
        type: 'boolean',
        description: 'Allow read actions',
      },
    },
  });
}
