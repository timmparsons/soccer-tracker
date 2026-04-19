import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import React, { useRef } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DrillVideoModalProps {
  visible: boolean;
  onClose: () => void;
  videoUrl: string;
  drillName: string;
  description?: string;
}

const DrillVideoModal = ({ visible, onClose, videoUrl, drillName, description }: DrillVideoModalProps) => {
  const videoRef = useRef<Video>(null);
  const insets = useSafeAreaInsets();

  const handleClose = async () => {
    await videoRef.current?.pauseAsync();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType='fade'
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'}
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        {/* Floating close button */}
        <TouchableOpacity
          onPress={handleClose}
          style={[styles.closeButton, { top: insets.top + 12 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name='close' size={22} color='#FFF' />
        </TouchableOpacity>

        {/* Centred content */}
        <View style={styles.content}>
          {visible && (
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay
            />
          )}

          <View style={styles.meta}>
            <Text style={styles.drillName}>{drillName}</Text>
            {description ? (
              <Text style={styles.description}>{description}</Text>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default DrillVideoModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#0a0a15',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  meta: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 8,
  },
  drillName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 21,
  },
});
