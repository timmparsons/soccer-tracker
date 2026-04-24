import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Purchases, { PurchasesOffering } from 'react-native-purchases';
import { useQuery } from '@tanstack/react-query';

const PRO_FEATURES = [
  { icon: '📊', label: 'Monthly progress charts' },
  { icon: '📋', label: 'Full session history' },
  { icon: '🏆', label: 'All achievements unlocked' },
  { icon: '⏱️', label: 'Custom practice timer' },
  { icon: '🎯', label: 'Advanced & intermediate drills' },
  { icon: '⚡', label: 'Daily challenges' },
  { icon: '🆚', label: 'Challenge other players' },
];

const COACH_FEATURES = [
  { icon: '👥', label: 'Create & manage your team' },
  { icon: '📊', label: 'Track every player\'s progress' },
  { icon: '✍️', label: 'Log touches on behalf of players' },
  { icon: '🏆', label: 'Full leaderboard access' },
  { icon: '➕', label: 'Add players directly from dashboard' },
];

export default function Paywall() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'pro' | 'coach'>(
    params.tab === 'coach' ? 'coach' : 'pro',
  );
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const { data: offerings, isLoading: offeringLoading } = useQuery<{
    pro: PurchasesOffering | null;
    coach: PurchasesOffering | null;
  }>({
    queryKey: ['offerings'],
    queryFn: async () => {
      if (Platform.OS === 'web') return { pro: null, coach: null };
      try {
        const all = await Purchases.getOfferings();
        return {
          pro: all.current,
          coach: all.all['coach'] ?? null,
        };
      } catch {
        return { pro: null, coach: null };
      }
    },
  });

  const proOffering = offerings?.pro ?? null;
  const coachOffering = offerings?.coach ?? null;

  const annualPackage = proOffering?.annual ?? null;
  const proMonthlyPackage = proOffering?.monthly ?? null;
  const coachMonthlyPackage = coachOffering?.monthly ?? null;

  const annualPrice = annualPackage?.product.priceString ?? '$34.99';
  const proMonthlyPrice = proMonthlyPackage?.product.priceString ?? '$4.99';
  const coachMonthlyPrice = coachMonthlyPackage?.product.priceString ?? '$19.99';

  const handlePurchase = async () => {
    let pkg = null;
    if (activeTab === 'pro') {
      pkg = selectedPlan === 'annual' ? annualPackage : proMonthlyPackage;
    } else {
      pkg = coachMonthlyPackage;
    }

    if (!pkg) {
      Alert.alert('Not available', 'Subscription products are not configured yet.');
      return;
    }

    setPurchasing(true);
    try {
      await Purchases.purchasePackage(pkg);
      queryClient.invalidateQueries({ queryKey: ['customerInfo'] });
      router.back();
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase failed', e.message ?? 'Something went wrong.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await Purchases.restorePurchases();
      const hasSub =
        typeof info.entitlements.active['pro'] !== 'undefined' ||
        typeof info.entitlements.active['coach'] !== 'undefined';
      if (hasSub) {
        queryClient.invalidateQueries({ queryKey: ['customerInfo'] });
        router.back();
      } else {
        Alert.alert('No purchases found', "We couldn't find an active subscription to restore.");
      }
    } catch (e: any) {
      Alert.alert('Restore failed', e.message ?? 'Something went wrong.');
    } finally {
      setRestoring(false);
    }
  };

  const features = activeTab === 'pro' ? PRO_FEATURES : COACH_FEATURES;
  const ctaLabel = activeTab === 'pro' ? 'START PRO — FREE TRIAL' : 'START COACH — FREE TRIAL';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        {/* Header */}
        <LinearGradient colors={['#1f89ee', '#1a1a2e']} style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name='close' size={22} color='rgba(255,255,255,0.8)' />
          </TouchableOpacity>
          <Text style={styles.crown}>👑</Text>
          <Text style={styles.headerTitle}>Master Touch Pro</Text>
          <Text style={styles.headerTagline}>Train smarter. Track everything. Dominate.</Text>
        </LinearGradient>

        {/* Tab selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pro' && styles.tabActive]}
            onPress={() => setActiveTab('pro')}
          >
            <Text style={[styles.tabText, activeTab === 'pro' && styles.tabTextActive]}>
              Player Pro
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'coach' && styles.tabActive]}
            onPress={() => setActiveTab('coach')}
          >
            <Text style={[styles.tabText, activeTab === 'coach' && styles.tabTextActive]}>
              Coach
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>
            {activeTab === 'pro' ? 'Everything in Player Pro' : 'Everything in Coach'}
          </Text>
          {features.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Ionicons name='checkmark-circle' size={18} color='#31af4d' />
            </View>
          ))}
        </View>

        {/* Plans */}
        {offeringLoading ? (
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonCard} />
            {activeTab === 'pro' && <View style={styles.skeletonCard} />}
          </View>
        ) : activeTab === 'pro' ? (
          <View style={styles.plansContainer}>
            {/* Annual */}
            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
              onPress={() => setSelectedPlan('annual')}
              activeOpacity={0.8}
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST VALUE · SAVE 42%</Text>
              </View>
              <View style={styles.planRow}>
                <View style={styles.planRadio}>
                  {selectedPlan === 'annual' && <View style={styles.planRadioInner} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Annual</Text>
                  <Text style={styles.planBilling}>{annualPrice} / year</Text>
                </View>
                <Text style={styles.planPriceMonthly}>
                  {annualPackage
                    ? `${(annualPackage.product.price / 12).toLocaleString('en-US', { style: 'currency', currency: annualPackage.product.currencyCode ?? 'USD', minimumFractionDigits: 2 })}/mo`
                    : '~$2.92/mo'}
                </Text>
              </View>
              <Text style={styles.planTrialNote}>7-day free trial</Text>
            </TouchableOpacity>

            {/* Monthly */}
            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.8}
            >
              <View style={styles.planRow}>
                <View style={styles.planRadio}>
                  {selectedPlan === 'monthly' && <View style={styles.planRadioInner} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Monthly</Text>
                  <Text style={styles.planBilling}>{proMonthlyPrice} / month</Text>
                </View>
              </View>
              <Text style={styles.planTrialNote}>7-day free trial</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.plansContainer}>
            {/* Coach monthly — single option */}
            <View style={[styles.planCard, styles.planCardSelected]}>
              <View style={styles.planRow}>
                <View style={styles.planRadio}>
                  <View style={styles.planRadioInner} />
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Coach Monthly</Text>
                  <Text style={styles.planBilling}>{coachMonthlyPrice} / month</Text>
                </View>
              </View>
              <Text style={styles.planTrialNote}>7-day free trial</Text>
            </View>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaButton, (purchasing || offeringLoading) && styles.ctaButtonDisabled]}
          onPress={handlePurchase}
          activeOpacity={0.85}
          disabled={purchasing || offeringLoading}
        >
          {purchasing ? (
            <ActivityIndicator color='#1a1a2e' />
          ) : (
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legalText}>
          {activeTab === 'pro' && selectedPlan === 'annual'
            ? 'Start your 7-day free trial. Cancel anytime before trial ends.'
            : 'Start your 7-day free trial. Billed monthly. Cancel anytime.'}
          {'\n'}Subscriptions renew automatically. Manage in App Store Settings.
        </Text>

        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.notion.so/Master-Touch-Privacy-Policy-2e56b6912afb802fa2ebd2ceb9a50b2c')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalLinkSeparator}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
            <Text style={styles.legalLink}>Terms of Use</Text>
          </TouchableOpacity>
        </View>

        {/* Restore */}
        <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreButton}>
          {restoring ? (
            <ActivityIndicator size='small' color='#78909C' />
          ) : (
            <Text style={styles.restoreText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scroll: {
    paddingBottom: 40,
  },

  // HEADER
  header: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crown: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 8,
  },
  headerTagline: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },

  // TABS
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: -20,
    marginBottom: 0,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#1f89ee',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#78909C',
  },
  tabTextActive: {
    color: '#FFF',
  },

  // FEATURES
  featuresCard: {
    backgroundColor: '#FFF',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  featureIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  featureLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },

  // SKELETON
  skeletonContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  skeletonCard: {
    height: 80,
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
  },

  // PLANS
  plansContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  planCardSelected: {
    borderColor: '#1f89ee',
    backgroundColor: '#EFF7FF',
  },
  bestValueBadge: {
    backgroundColor: '#ffb724',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  bestValueText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#1f89ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1f89ee',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  planBilling: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
  planPriceMonthly: {
    fontSize: 14,
    fontWeight: '800',
    color: '#31af4d',
  },
  planTrialNote: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f89ee',
    marginTop: 8,
    marginLeft: 34,
  },

  // CTA
  ctaButton: {
    marginHorizontal: 20,
    backgroundColor: '#ffb724',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#ffb724',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 12,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: 0.5,
  },

  legalText: {
    fontSize: 11,
    color: '#78909C',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 17,
    marginBottom: 16,
  },

  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    textDecorationLine: 'underline',
  },
  legalLinkSeparator: {
    fontSize: 12,
    color: '#78909C',
  },

  // RESTORE
  restoreButton: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
    textDecorationLine: 'underline',
  },
});
