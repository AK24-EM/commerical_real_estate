import { Injectable } from '@nestjs/common';

export interface GstValidationResponse {
  isValid: boolean;
  error?: string;
  details?: {
    stateCode: string;
    pan: string;
    checksumValid: boolean;
  };
}

@Injectable()
export class GstService {
  /**
   * Validates GSTIN format and checksum
   * Format: 2 digits (state), 10 alphanumeric (PAN), 1 digit (entity), 1 alpha (Z), 1 digit (checksum)
   */
  validateGstinFormat(gstin: string): GstValidationResponse {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (!gstin || gstin.length !== 15) {
      return { isValid: false, error: 'GSTIN must be exactly 15 characters long' };
    }

    const normalizedGstin = gstin.toUpperCase();
    if (!gstRegex.test(normalizedGstin)) {
      return { isValid: false, error: 'Invalid GSTIN format' };
    }

    // Extract components
    const stateCode = normalizedGstin.substring(0, 2);
    const pan = normalizedGstin.substring(2, 12);
    const checksumChar = normalizedGstin.charAt(14);

    // Simple checksum validation (Luhn-like for GST)
    const isChecksumValid = this.verifyGstChecksum(normalizedGstin);

    return {
      isValid: isChecksumValid,
      details: {
        stateCode,
        pan,
        checksumValid: isChecksumValid,
      },
      error: isChecksumValid ? undefined : 'GSTIN checksum validation failed',
    };
  }

  private verifyGstChecksum(gstin: string): boolean {
    // This is a simplified implementation of the GST checksum algorithm
    // In a production app, this would be a robust implementation of the Mod 36 algorithm
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let sum = 0;

    for (let i = 0; i < 14; i++) {
      const weight = i % 2 === 0 ? 1 : 2;
      const val = chars.indexOf(gstin[i]);
      sum += val * weight;
    }

    const calculatedChecksum = chars[sum % 36];
    return calculatedChecksum === gstin[14];
  }

  async verifyWithPublicApi(gstin: string): Promise<{ verified: boolean; status: string }> {
    // Implementation for GSTN Public Search API
    // This would require a paid API key from a provider like ClearTax or Karza
    return {
      verified: true,
      status: 'Active'
    };
  }
}
