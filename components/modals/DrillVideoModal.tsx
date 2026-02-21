import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect } from 'react';
import {
  Modal,
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
}

const DrillVideoModal = ({ visible, onClose, videoUrl, drillName }: DrillVideoModalProps) => {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (!visible) {
      player.pause();
    }
  }, [visible, player]);

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{drillName}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name='close' size={24} color='#1a1a2e' />
          </TouchableOpacity>
        </View>

        {/* Video */}
        <VideoView
          player={player}
          style={styles.video}
          allowsFullscreen
          allowsPictureInPicture
          contentFit='contain'
        />

        <Text style={styles.caption}>Drill Tutorial — Coach Vinnie</Text>
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
    flex: 1,
    width: '100%',
  },
  caption: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
});
