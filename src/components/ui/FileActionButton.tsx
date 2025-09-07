import React, { useState } from 'react';
import { Button, HStack, IconButton, Menu, Portal } from '@chakra-ui/react';
import { LuEye as View, LuDownload as Download, LuEllipsis as MoreVertical } from 'react-icons/lu';
import { getComposerFileType } from '../../utils/composerParser';
import { HistoryApiService } from '../../services/apiCallService';
import { useToastNotifications } from '../../hooks/useToastNotifications';
import { ComposerFilesDialog } from './ComposerFilesDialog';

interface FileActionButtonProps {
  snapshotId: string;
  filename: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'outline' | 'ghost' | 'solid';
  showLabels?: boolean;
  compact?: boolean;
}

export const FileActionButton: React.FC<FileActionButtonProps> = ({
  snapshotId,
  filename,
  size = 'sm',
  variant = 'outline',
  showLabels = false,
  compact = false
}) => {
  const [showComposerDialog, setShowComposerDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const toast = useToastNotifications();
  const fileType = getComposerFileType(filename);
  const isComposerFile = fileType === 'json' || fileType === 'lock';

  const handleView = () => {
    if (isComposerFile) {
      setShowComposerDialog(true);
    } else {
      toast.showError({ title: 'File viewing is only supported for composer.json and composer.lock files' });
    }
  };

  const handleDownload = async () => {
    if (!isComposerFile) {
      toast.showError({ title: 'File download is only supported for composer.json and composer.lock files' });
      return;
    }

    setIsDownloading(true);
    try {
      const blob = await HistoryApiService.downloadSnapshot(snapshotId, filename as 'composer.json' | 'composer.lock');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.showSuccess({ title: `Downloaded ${filename}` });
    } catch (error) {
      console.error(`Failed to download ${filename}:`, error);
      toast.showError({ title: `Failed to download ${filename}` });
    } finally {
      setIsDownloading(false);
    }
  };

  // If not a composer file, show disabled buttons with helpful tooltips
  if (!isComposerFile) {
    if (compact) {
      return (
        <Menu.Root>
          <Menu.Trigger asChild>
            <IconButton
              variant={variant}
              size={size}
              disabled
              title="File actions are only available for composer.json and composer.lock files"
            >
              <MoreVertical size={16} />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                {/* Empty - disabled menu */}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      );
    }

    return (
      <HStack gap={1}>
        <IconButton
          variant={variant}
          size={size}
          disabled
          title="File viewing is only available for composer.json and composer.lock files"
        >
          <View size={16} />
        </IconButton>
        <IconButton
          variant={variant}
          size={size}
          disabled
          title="File download is only available for composer.json and composer.lock files"
        >
          <Download size={16} />
        </IconButton>
      </HStack>
    );
  }

  // Compact version with dropdown menu
  if (compact) {
    return (
      <>
        <Menu.Root>
          <Menu.Trigger asChild>
            <IconButton
              variant={variant}
              size={size}
              title={`Actions for ${filename}`}
            >
              <MoreVertical size={16} />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item value="view" onClick={handleView}>
                  <View size={16} />
                  <span>View Packages</span>
                </Menu.Item>
                <Menu.Item value="download" onClick={handleDownload} disabled={isDownloading}>
                  <Download size={16} />
                  <span>{isDownloading ? 'Downloading...' : 'Download File'}</span>
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>

        <ComposerFilesDialog
          isOpen={showComposerDialog}
          onClose={() => setShowComposerDialog(false)}
          snapshotId={snapshotId}
          title={`${filename} - Package Details`}
        />
      </>
    );
  }

  // Full button layout
  const buttonContent = (
    <HStack gap={showLabels ? 2 : 1}>
      <Button
        variant={variant}
        size={size}
        onClick={handleView}
        title="View packages in table format"
      >
        <View size={16} />
        {showLabels && 'View'}
      </Button>
      <Button
        variant={variant}
        size={size}
        onClick={handleDownload}
        loading={isDownloading}
        title="Download original file"
      >
        <Download size={16} />
        {showLabels && (isDownloading ? 'Downloading...' : 'Download')}
      </Button>
    </HStack>
  );

  return (
    <>
      {buttonContent}
      <ComposerFilesDialog
        isOpen={showComposerDialog}
        onClose={() => setShowComposerDialog(false)}
        snapshotId={snapshotId}
        title={`${filename} - Package Details`}
      />
    </>
  );
};