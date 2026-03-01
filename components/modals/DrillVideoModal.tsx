import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import React, { useRef } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DrillVideoModalProps {
  visible: boolean;
  onClose: () => void;
  videoUrl: string;
  drillName: string;
  description?: string;
}

const DrillVideoModal = ({ visible, onClose, videoUrl, drillName, description }: DrillVideoModalProps) => {
  const videoRef = useRef<Video>(null);

  const handleClose = async () => {
    await videoRef.current?.pauseAsync();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{drillName}</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name='close' size={24} color='#FFF' />
          </TouchableOpacity>
        </View>

        {/* Video */}
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          shouldPlay={visible}
        />

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <Text style={styles.caption}>Drill Tutorial — Coach Vinnie</Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default DrillVideoModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginRight: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  caption: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
});
