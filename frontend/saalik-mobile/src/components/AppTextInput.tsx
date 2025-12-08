import { TextInput, TextInputProps, StyleSheet } from 'react-native';

export function AppTextInput(props: TextInputProps) {
    return <TextInput {...props} style={[styles.default, props.style]} />;
}

const styles = StyleSheet.create({
    default: {
        fontFamily: 'LeagueSpartan_400Regular',
    },
});
