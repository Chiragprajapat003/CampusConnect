import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { COLORS } from "../../lib/config";

/**
 * Register Screen with Profile Photo Upload & Gmail OTP Verification
 * 
 * WHAT IT DOES:
 * 1. Collects student details & allows uploading their real profile photo.
 * 2. Generates & sends a 6-digit OTP code to the student's Gmail/Email.
 * 3. Verifies the OTP code before creating the account in MongoDB.
 */
export default function RegisterScreen() {
  const router = useRouter();
  const { register, sendOtp } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Registration Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUri, setAvatarUri] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // 2-Step Flow States
  const [currentStep, setCurrentStep] = useState(1); // 1: Form, 2: OTP Verification
  const [otpCode, setOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Status States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (currentStep === 2 && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentStep, resendTimer]);

  // 1. Pick Profile Avatar Photo
  const handlePickAvatar = () => {
    Alert.alert(
      "Profile Photo",
      "Choose how you want to add your profile photo:",
      [
        {
          text: "Take Photo (Camera)",
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert("Permission Required", "Camera access is needed to take a profile photo.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets[0]?.uri) {
              setAvatarUri(result.assets[0].uri);
            }
          },
        },
        {
          text: "Choose from Gallery",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets[0]?.uri) {
              setAvatarUri(result.assets[0].uri);
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  // 2. Step 1: Send OTP to Email
  const handleSendOtp = async () => {
    setErrorMessage("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage("Please fill in your full name, email, and password.");
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setErrorMessage("Please enter a valid email address (e.g. yourname@gmail.com).");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    try {
      setIsLoading(true);
      await sendOtp(normalizedEmail);
      setCurrentStep(2);
      setResendTimer(60);
      setCanResend(false);
    } catch (error) {
      setErrorMessage(error.message || "Failed to send verification code. Please check your email.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    try {
      setIsLoading(true);
      setErrorMessage("");
      await sendOtp(email.toLowerCase().trim());
      setResendTimer(60);
      setCanResend(false);
    } catch (error) {
      setErrorMessage(error.message || "Could not resend OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Step 2: Verify OTP & Complete Registration
  const handleVerifyAndRegister = async () => {
    setErrorMessage("");

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      setIsLoading(true);
      await register({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        phone: phone.trim(),
        otp: otpCode.trim(),
        avatarUri,
      });
      // AuthGuard in `_layout.jsx` handles redirection to `/(tabs)/home`
    } catch (error) {
      setErrorMessage(error.message || "Invalid or expired OTP code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                if (currentStep === 2) {
                  setCurrentStep(1);
                  setErrorMessage("");
                } else {
                  router.back();
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {currentStep === 1 ? "Create Account" : "Verify Email ✉️"}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {currentStep === 1
                  ? "Join your verified campus network"
                  : `Enter the 6-digit code sent to ${email}`}
              </Text>
            </View>

            {/* Error Banner */}
            {errorMessage ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.errorBg }]}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* ─── STEP 1: REGISTRATION FORM ─── */}
            {currentStep === 1 ? (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Profile Photo Avatar Picker */}
                <View style={styles.avatarPickerSection}>
                  <TouchableOpacity
                    style={[styles.avatarCircle, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                    onPress={handlePickAvatar}
                    activeOpacity={0.8}
                  >
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={38} color={colors.primary} />
                      </View>
                    )}
                    <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="camera" size={14} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                  <Text style={[styles.avatarHintText, { color: colors.textSecondary }]}>
                    {avatarUri ? "Tap to change photo" : "Upload your profile photo (Optional)"}
                  </Text>
                </View>

                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Full Name</Text>
                  <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={colors.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      placeholder="e.g. Alex Rivera"
                      placeholderTextColor={colors.textMuted}
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>

                {/* Email Address */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Email Address</Text>
                  <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={colors.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      placeholder="yourname@gmail.com"
                      placeholderTextColor={colors.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Password</Text>
                  <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={colors.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor={colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Phone Number (Optional) */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Phone Number</Text>
                    <Text style={[styles.optionalBadge, { color: colors.textMuted }]}>Optional</Text>
                  </View>
                  <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Ionicons
                      name="call-outline"
                      size={20}
                      color={colors.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      placeholder="+1 (555) 000-0000"
                      placeholderTextColor={colors.textMuted}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                    Allows students to contact you when your lost item is found
                  </Text>
                </View>

                {/* Submit Step 1 Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]}
                  onPress={handleSendOtp}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <View style={styles.buttonRow}>
                      <Text style={styles.primaryButtonText}>Verify Email with OTP</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* ─── STEP 2: 6-DIGIT OTP VERIFICATION CARD ─── */
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.otpIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
                </View>

                <Text style={[styles.otpCardTitle, { color: colors.textPrimary }]}>Enter Verification Code</Text>
                <Text style={[styles.otpCardSubtitle, { color: colors.textSecondary }]}>
                  We have sent a 6-digit OTP to{"\n"}
                  <Text style={{ fontWeight: "700", color: colors.primary }}>{email}</Text>
                </Text>

{/* 6-Digit OTP Code Input */}
                <View style={styles.otpInputWrapper}>
                  <TextInput
                    style={[
                      styles.otpTextInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: otpCode.length === 6 ? colors.primary : colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder="• • • • • •"
                    placeholderTextColor={colors.textMuted}
                    value={otpCode}
                    onChangeText={(t) => setOtpCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]}
                  onPress={handleVerifyAndRegister}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify & Create Account</Text>
                  )}
                </TouchableOpacity>

                {/* Resend OTP Row */}
                <View style={styles.resendRow}>
                  {canResend ? (
                    <TouchableOpacity onPress={handleResendOtp}>
                      <Text style={[styles.resendLink, { color: colors.primary }]}>Resend Code</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.resendTimerText, { color: colors.textSecondary }]}>
                      Resend code in {resendTimer}s
                    </Text>
                  )}
                </View>

                {/* Change Email Button */}
                <TouchableOpacity
                  style={styles.changeEmailButton}
                  onPress={() => {
                    setCurrentStep(1);
                    setErrorMessage("");
                  }}
                >
                  <Text style={[styles.changeEmailText, { color: colors.textSecondary }]}>
                    Edit Details / Change Email
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Switch to Login */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
                <Text style={[styles.footerLink, { color: colors.primary }]}> Log in</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  avatarPickerSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    position: "relative",
    overflow: "visible",
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarHintText: {
    fontSize: 12,
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  optionalBadge: {
    fontSize: 12,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  eyeButton: {
    padding: 6,
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 2,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  otpIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  otpCardTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  otpCardSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  otpHelperBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  otpHelperCode: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  autoFillPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  autoFillPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  otpInputWrapper: {
    alignItems: "center",
    marginBottom: 20,
  },
  otpTextInput: {
    width: "100%",
    height: 58,
    borderRadius: 16,
    borderWidth: 2,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 10,
  },
  resendRow: {
    alignItems: "center",
    marginTop: 16,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: "700",
  },
  resendTimerText: {
    fontSize: 13,
  },
  changeEmailButton: {
    alignSelf: "center",
    marginTop: 14,
  },
  changeEmailText: {
    fontSize: 13,
    textDecorationLine: "underline",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});
