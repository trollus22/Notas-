import { StyleSheet, Text, View } from 'react-native';

import { type Agent } from '@/lib/agents';

/** Avatar de una agente: su inicial sobre un color apagado. */
export function AgentAvatar({ agent, size = 28 }: { agent: Agent; size?: number }) {
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size / 2, backgroundColor: agent.bg }]}>
      <Text style={{ color: agent.fg, fontSize: size * 0.45, fontWeight: '600' }}>{agent.name[0].toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ box: { alignItems: 'center', justifyContent: 'center' } });
