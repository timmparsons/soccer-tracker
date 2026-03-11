import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const FEATURES = [
  { icon: '📊', label: 'Monthly progress charts' },
  { icon: '📋', label: 'Full session history' },
  { icon: '🏆', label: 'All achievements unlocked' },
  { icon: '👥', label: 'Create & manage a team' },
  { icon: '⏱️', label: 'Custom practice timer' },
];

export default function Paywall() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const { data: offering, isLoading: offeringLoading } = useQuery<PurchasesOffering | null>({
    queryKey: ['offerings'],
    queryFn: async () => {
      if (Platform.OS === 'web') return null;
      try {
        const offerings = await Purchases.getOfferings();
        return offerings.current;
      } catch {
        return null;
      }
    },
  });

  const annualPackage = offering?.annual ?? null;
  const monthlyPackage = offering?.monthly ?? null;

  const annualPrice = annualPackage?.product.priceString ?? '$34.99';
  const monthlyPrice = monthlyPackage?.product.priceString ?? '$4.99';

  const handlePurchase = async () => {
    const pkg = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
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
      const isPro = typeof info.entitlements.active['pro'] !== 'undefined';
      if (isPro) {
        queryClient.invalidateQueries({ queryKey: ['customerInfo'] });
        router.back();
      } else {
        Alert.alert('No purchases found', 'We couldn\'t find an active subscription to restore.');
      }
    } catch (e: any) {
      Alert.alert('Restore failed', e.message ?? 'Something went wrong.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        {/* Header */}
        <LinearGradient
          colors={['#1f89ee', '#1a1a2e']}
          style={styles.header}
        >
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name='close' size={22} color='rgba(255,255,255,0.8)' />
          </TouchableOpacity>
          <Text style={styles.crown}>👑</Text>
          <Text style={styles.headerTitle}>MasterTouch Pro</Text>
          <Text style={styles.headerTagline}>Train smarter. Track everything. Dominate.</Text>
        </LinearGradient>

        {/* Features */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Everything in Pro</Text>
          {FEATURES.map((f) => (
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
            <View style={styles.skeletonCard} />
          </View>
        ) : (
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
                  <Text style={styles.planBilling}>{monthlyPrice} / month</Text>
                </View>
              </View>
            </TouchableOpacity>
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
            <Text style={styles.ctaText}>START PRO NOW</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legalText}>
          {selectedPlan === 'annual'
            ? 'Start your 7-day free trial. Cancel anytime before trial ends.'
            : 'Billed monthly. Cancel anytime.'}
          {'\n'}Subscriptions renew automatically. Manage in App Store Settings.
        </Text>

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

  // FEATURES
  featuresCard: {
    backgroundColor: '#FFF',
    margin: 20,
    marginTop: -20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
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
