import { Text, TextProps, StyleSheet } from 'react-native';

export function AppText(props: TextProps) {
    return <Text {...props} style={[styles.default, props.style]} />;
}

const styles = StyleSheet.create({
    default: {
        fontFamily: 'LeagueSpartan_400Regular',
    },
});
