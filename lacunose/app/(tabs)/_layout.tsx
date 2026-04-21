import React from 'react';
import { Tabs } from 'expo-router';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '../../components/Shared';
import { RGF } from '../../constants/theme';

function FloatingNav({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.floatingNavContainer}>
      <View style={styles.floatingNav}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          let iconName = 'home';
          if (route.name === 'home') iconName = 'home';
          if (route.name === 'library') iconName = 'layers';
          if (route.name === 'analyze') iconName = 'sparkle';
          if (route.name === 'me') iconName = 'person';

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.8}
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={[
                styles.navItem,
                isFocused && styles.navItemFocused
              ]}
            >
              <Icon name={iconName} size={22} color={isFocused ? '#fff' : RGF.ink} stroke={1.7} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <FloatingNav {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: RGF.bg }
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="analyze" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingNavContainer: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  floatingNav: {
    backgroundColor: '#fff',
    borderRadius: 40,
    padding: 6,
    flexDirection: 'row',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    borderWidth: 1,
    borderColor: RGF.hair,
  },
  navItem: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemFocused: {
    backgroundColor: RGF.ink,
  }
});
