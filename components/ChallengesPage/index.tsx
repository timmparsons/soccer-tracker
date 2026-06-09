import PageHeader from '@/components/common/PageHeader';
import ChallengesCard from '@/components/HomePage/ChallengesCard';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { getDisplayName } from '@/utils/getDisplayName';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function ChallengesPage() {
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);

  return (
    <View style={styles.container}>
      <PageHeader
        title="Challenges"
        showAvatar
        avatarUrl={profile?.avatar_url}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {user?.id && (
          <ChallengesCard
            userId={user.id}
            teamId={profile?.team_id ?? null}
            playerName={getDisplayName(profile)}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 0,
  },
});
