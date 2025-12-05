/**
 * Android XML Output Adapter
 *
 * Transforms normalized design tokens into Android resource XML format.
 * Supports Android 13-15 (API 33-35) with Material 3 compatibility.
 */

export {
  AndroidXmlAdapter,
  createAndroidXmlAdapter,
  type AndroidXmlOutput,
  type AndroidXmlAdapterOptions,
} from './adapter.js';

export {
  colorToAndroid,
  colorToAndroidRgb,
  dimensionToAndroid,
  numberToAndroidDimen,
  tokenNameToAndroid,
  ensureValidAndroidName,
  fontWeightToAndroid,
  typographyToAndroidAttrs,
  escapeXml,
  xmlHeader,
  indent,
  type AndroidDimensionUnit,
} from './converters.js';
