// components/FullImageModal.js

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Dimensions,
  Image,
  Text,
  FlatList,
  TouchableOpacity,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function FullImageModal({ visible, images, initialIndex = 0, onClose }) {
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        if (flatListRef.current && initialIndex >= 0 && initialIndex < images.length) {
          flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
        }
      }, 0);
    }
  }, [visible, initialIndex, images.length]);

  if (!visible || !images || images.length === 0) {
    return null;
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={1}
      style={styles.slide}
      // tap på billedet lukker også
      onPress={onClose}
    >
      <Image
        source={{ uri: item }}
        style={styles.image}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent>
      <View style={styles.container}>
        {/* Close-knap */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>

        {/* Galleri */}
        <FlatList
          ref={flatListRef}
          data={images}
          keyExtractor={(uri, idx) => uri + idx}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(idx);
          }}
          getItemLayout={(data, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />

        {/* Indikator i bunden */}
        <View style={styles.indexIndicator}>
          <Text style={styles.indexText}>
            {currentIndex + 1} / {images.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '95%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#00000088',
    borderRadius: 8,
  },
  closeText: {
    color: '#fff',
    fontSize: 14,
  },
  indexIndicator: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#00000088',
    borderRadius: 999,
  },
  indexText: {
    color: '#fff',
    fontSize: 13,
  },
});