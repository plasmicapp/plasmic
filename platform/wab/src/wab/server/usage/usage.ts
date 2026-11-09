export function getSelfUsage() {}

export function getTeamUsage() {}

export async function getSelfChatTokensUsage() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
}

export function safeRecordUsage() {}

export function recordUsage() {}

export function recordUsages() {}

export function recordPulledUsage() {}
