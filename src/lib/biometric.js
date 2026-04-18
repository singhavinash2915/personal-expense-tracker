// Biometric authentication service
// Uses @aparajita/capacitor-biometric-auth on native, falls back gracefully on web.

import { Capacitor } from '@capacitor/core'

const isNative = Capacitor.isNativePlatform()

export async function checkBiometryAvailable() {
  if (!isNative) return { available: false, reason: 'web' }
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
    const info = await BiometricAuth.checkBiometry()
    return {
      available: info.isAvailable,
      type: info.biometryType,
      reason: info.reason || null,
    }
  } catch (err) {
    return { available: false, reason: err.message }
  }
}

export async function authenticateBiometric(reason = 'Unlock ExpenseFlow') {
  if (!isNative) {
    // On web, just allow through (biometric is native-only)
    return { success: true, web: true }
  }
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Cancel',
      allowDeviceCredential: true,
      iosFallbackTitle: 'Use Passcode',
      androidTitle: 'ExpenseFlow Lock',
      androidSubtitle: 'Authenticate to access your finances',
      androidConfirmationRequired: false,
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Authentication failed' }
  }
}

export function getBiometryLabel(type) {
  // Returns user-friendly label based on BiometryType enum
  switch (type) {
    case 1: return 'Touch ID'
    case 2: return 'Face ID'
    case 3: return 'Fingerprint'
    case 4: return 'Face Unlock'
    case 5: return 'Iris'
    default: return 'Biometric'
  }
}
