/**
 * Platform-Specific Sharing Utilities
 * 
 * Provides cross-platform sharing functionality with Web Share API
 * and clipboard fallback for challenge completion results.
 */

export interface ShareData {
  title?: string;
  text: string;
  url?: string;
}

export interface ShareResult {
  success: boolean;
  method: 'native' | 'clipboard' | 'fallback';
  error?: string;
}

/**
 * Check if Web Share API is available
 */
export function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 
         'share' in navigator && 
         typeof navigator.share === 'function';
}

/**
 * Check if Clipboard API is available
 */
export function isClipboardSupported(): boolean {
  return typeof navigator !== 'undefined' && 
         'clipboard' in navigator && 
         typeof navigator.clipboard?.writeText === 'function';
}

/**
 * Share content using the best available method
 */
export async function shareContent(data: ShareData): Promise<ShareResult> {
  const { title = 'WordPlay Challenge', text, url } = data;

  // Try Web Share API first (mobile browsers, some desktop)
  if (isWebShareSupported()) {
    try {
      await navigator.share({
        title,
        text,
        url
      });
      
      return {
        success: true,
        method: 'native'
      };
    } catch (error) {
      // User cancelled or share failed, fall back to clipboard
      console.log('Web Share cancelled or failed, trying clipboard');
    }
  }

  // Try Clipboard API as fallback
  if (isClipboardSupported()) {
    try {
      await navigator.clipboard.writeText(text);
      
      return {
        success: true,
        method: 'clipboard'
      };
    } catch (error) {
      console.warn('Clipboard write failed:', error);
    }
  }

  // Final fallback - create a temporary textarea and copy
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999); // For mobile devices
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      return {
        success: true,
        method: 'fallback'
      };
    }
  } catch (error) {
    console.warn('Fallback copy failed:', error);
  }

  return {
    success: false,
    method: 'fallback',
    error: 'No sharing method available'
  };
}

/**
 * Share challenge result with appropriate formatting
 */
export async function shareChallengeResult(shareText: string): Promise<ShareResult> {
  const result = await shareContent({
    title: 'WordPlay Challenge Result',
    text: shareText
  });

  return result;
}

/**
 * Get user-friendly message for share result
 */
export function getShareResultMessage(result: ShareResult): string {
  if (result.success) {
    switch (result.method) {
      case 'native':
        return 'Shared successfully!';
      case 'clipboard':
        return 'Copied to clipboard!';
      case 'fallback':
        return 'Copied to clipboard!';
      default:
        return 'Shared successfully!';
    }
  } else {
    return result.error || 'Sharing failed. Please try again.';
  }
} 