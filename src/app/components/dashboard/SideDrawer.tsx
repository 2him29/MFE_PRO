import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet';

interface SideDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SideDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
}: SideDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[600px] overflow-y-auto rounded-l-2xl border-l border-border/70 bg-background">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="mt-8 px-6 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
