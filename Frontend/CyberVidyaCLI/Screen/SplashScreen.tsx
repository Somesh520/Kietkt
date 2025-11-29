import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // Split the text into an array of characters
  const text = "Bunkbook";
  const letters = text.split('');

  // Create an animated value for EACH letter
  const animatedValues = useRef(letters.map(() => new Animated.Value(0))).current;
  
  // Animation for tagline and footer
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const lineScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animations = letters.map((_, index) => {
      return Animated.spring(animatedValues[index], {
        toValue: 1,
        friction: 6,      // Bounciness
        tension: 40,      // Speed
        useNativeDriver: true,
      });
    });

    Animated.sequence([
      Animated.delay(300),
      
      // 1. Stagger the letters (one by one appearance)
      Animated.stagger(100, animations),

      // 2. Expand the line under the text
      Animated.timing(lineScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),

      // 3. Show Tagline
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),

      Animated.delay(1200),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Subtle Background Pattern */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <View style={styles.centerContent}>
        
        {/* --- ANIMATED TEXT ROW --- */}
        <View style={styles.textRow}>
          {letters.map((letter, index) => {
            return (
              <Animated.Text
                key={index}
                style={[
                  styles.letter,
                  {
                    opacity: animatedValues[index], // Fade in
                    transform: [
                      {
                        translateY: animatedValues[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0], // Slide Up from 50px
                        }),
                      },
                      {
                        scale: animatedValues[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1], // Grow in size
                        }),
                      }
                    ],
                  },
                ]}
              >
                {letter}
              </Animated.Text>
            );
          })}
        </View>

        {/* Decorative Line */}
        <Animated.View 
          style={[
            styles.underline, 
            { transform: [{ scaleX: lineScale }] }
          ]} 
        />

        {/* --- TAGLINE --- */}
        <Animated.View style={{ opacity: contentOpacity, marginTop: 20, alignItems: 'center' }}>
          <View style={styles.taglinePill}>
            <Text style={styles.tagline}>OFFICIAL MANAGER FOR UNOFFICIAL HOLIDAYS</Text>
          </View>
        </Animated.View>

      </View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: contentOpacity }]}>
        <Text style={styles.footerText}>Made for Cybervidhya Students 🎓</Text>
      </Animated.View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean White
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Abstract Background
  bgCircle1: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#F0F9FF', // Very Light Blue
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#F5F3FF', // Very Light Purple
  },

  centerContent: {
    alignItems: 'center',
    zIndex: 10,
  },

  // Text Animation Styles
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    height: 80, // Fix height to prevent clipping
  },
  letter: {
    fontSize: 48,
    fontWeight: '900', // Heavy Bold
    color: '#1E293B', // Slate Dark
    fontFamily: 'System', // Use default bold font
    marginHorizontal: 1, // Slight spacing
  },
  underline: {
    height: 4,
    width: 120,
    backgroundColor: '#3B82F6', // Blue Accent
    borderRadius: 2,
    marginTop: 5,
  },

  // Tagline Styles
  taglinePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 50,
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
});

export default SplashScreen;