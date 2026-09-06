export type MediaItem = {
  id: string;
  type: "IMAGE" | "VIDEO" | string;
  url: string;
  thumbnailUrl?: string | null;
  filename: string;
  mimeType: string;
  size: number;
  title?: string | null;
  altText?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  usageCount?: number;
};

export type MediaPickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selected: MediaItem[]) => void;
  allowedTypes?: ("IMAGE" | "VIDEO")[];
  multiple?: boolean;
  title?: string;
  confirmText?: string;
  initialSelectedUrls?: string[];
  initialSelectedIds?: string[];
};
