import { useQuery } from '@tanstack/react-query';

export interface CoachingTip {
  title: string;
  body: string;
}

export interface CoachingParams {
  playerCount: number;
  activePlayers: number;
  inactivePlayers: string[];
  avgTpm: number;
  topPlayerName: string | undefined;
  topPlayerWeekTouches: number;
  avgWeekTouches: number;
}

export function useCoachingTips(teamId: string | undefined, params: CoachingParams | null) {
  return useQuery({
    queryKey: ['coaching-tips', teamId],
    enabled: !!teamId && !!params,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async (): Promise<CoachingTip[]> => {
      const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
      if (!apiKey || !params) return [];

      const userMessage = [
        `Team stats:`,
        `- ${params.playerCount} players total, ${params.activePlayers} active this week`,
        params.inactivePlayers.length > 0
          ? `- Inactive players (7+ days): ${params.inactivePlayers.join(', ')}`
          : null,
        `- Team avg tempo: ${params.avgTpm > 0 ? `${params.avgTpm} touches/min` : 'no data'}`,
        `- Avg weekly touches per player: ${params.avgWeekTouches.toLocaleString()}`,
        params.topPlayerName
          ? `- Top performer: ${params.topPlayerName} (${params.topPlayerWeekTouches.toLocaleString()} touches this week)`
          : null,
      ]
        .filter(Boolean)
        .join('\n');

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system:
            'You are a youth football (soccer) coaching advisor. Given team training stats, return exactly 3 actionable coaching tips as JSON: {"tips":[{"title":"...","body":"..."}]}. Each title max 6 words, body max 20 words. Focus on practical ball work drills and player motivation. Respond ONLY with valid JSON.',
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (!res.ok) return [];

      const data = await res.json();
      const text = data?.content?.[0]?.text ?? '';
      const parsed = JSON.parse(text) as { tips: CoachingTip[] };
      return Array.isArray(parsed?.tips) ? parsed.tips : [];
    },
  });
}
