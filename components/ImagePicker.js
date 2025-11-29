import { useState } from 'react';
import { TouchableOpacity, Image, View, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * ImagePickerExample er en komponent der giver brugeren mulighed for at vælge et billede fra deres enhed, billedet vises derefter i appen.
 */

export default function ImagePickerExample() {
  const [image, setImage] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>

      <TouchableOpacity onPress={pickImage} >
        {image ? <Image source={{ uri: image }} style={styles.image} /> : <Image source={require('../assets/imagePick.png')} style={styles.image} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  image: {
    width: 200,
    height: 200,
  },
});
