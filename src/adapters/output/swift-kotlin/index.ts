/**
 * Swift/Kotlin Output Adapter
 *
 * Transforms normalized design tokens into Swift (iOS/SwiftUI) and Kotlin (Android/Compose)
 * native constant files.
 */

export {
  SwiftKotlinAdapter,
  createSwiftKotlinAdapter,
  type SwiftKotlinOutput,
  type SwiftKotlinAdapterOptions,
} from './adapter.js';

export {
  colorToSwift,
  colorToUIKit,
  colorToSwiftHex,
  colorToKotlin,
  colorToKotlinArgb,
  colorToKotlinHex,
  dimensionToSwift,
  dimensionToSwiftValue,
  dimensionToKotlin,
  dimensionToKotlinValue,
  tokenNameToSwift,
  tokenNameToKotlin,
  ensureValidSwiftName,
  ensureValidKotlinName,
  fontWeightToSwift,
  fontWeightToKotlin,
  typographyToSwift,
  typographyToKotlin,
  shadowToSwift,
  shadowToKotlin,
  gradientToSwift,
  gradientToKotlin,
  swiftFileHeader,
  kotlinFileHeader,
  indent,
  escapeSwiftString,
  escapeKotlinString,
  type SwiftDimensionUnit,
} from './converters.js';
