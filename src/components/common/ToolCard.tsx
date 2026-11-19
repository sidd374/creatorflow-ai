import React from 'react';
import { 
  Heading, 
  Anchor, 
  FileText, 
  Search, 
  Hash, 
  Smartphone, 
  MessageSquare, 
  Image as ImageIcon, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Tool } from '../../types';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface ToolCardProps {
  tool: Tool;
  onOpen: (tool: Tool) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Heading: <Heading className="w-5 h-5 text-neutral-800" />,
  Anchor: <Anchor className="w-5 h-5 text-neutral-800" />,
  FileText: <FileText className="w-5 h-5 text-neutral-800" />,
  Search: <Search className="w-5 h-5 text-neutral-800" />,
  Hash: <Hash className="w-5 h-5 text-neutral-800" />,
  Smartphone: <Smartphone className="w-5 h-5 text-neutral-800" />,
  MessageSquare: <MessageSquare className="w-5 h-5 text-neutral-800" />,
  Image: <ImageIcon className="w-5 h-5 text-neutral-800" />,
  Sparkles: <Sparkles className="w-5 h-5 text-neutral-800" />,
};

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onOpen }) => {
  return (
    <Card hoverEffect className="flex flex-col h-full group bg-white border border-black/[0.08] rounded-lg">
      <CardContent className="p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="w-10 h-10 rounded-md bg-[#f8f7f4] flex items-center justify-center border border-black/[0.06] group-hover:bg-[#1a1a1a] group-hover:text-white transition-colors duration-200 [&>svg]:group-hover:text-white">
            {ICON_MAP[tool.iconName] || <Sparkles className="w-5 h-5 text-neutral-800" />}
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 group-hover:text-neutral-600 transition-colors">
            {tool.category}
          </span>
        </div>

        <h3 className="font-serif text-xl font-normal text-[#1a1a1a] mb-1.5 group-hover:text-[#d4a017] transition-colors">
          {tool.title}
        </h3>

        <p className="text-xs text-neutral-600 leading-relaxed flex-1 mb-6 font-sans">
          {tool.description}
        </p>

        <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between">
          <span className="text-[10px] text-neutral-400 font-mono">
            {tool.badge || 'Verified Engine'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpen(tool)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />}
            className="text-xs font-mono uppercase tracking-wider group-hover:bg-[#1a1a1a] group-hover:text-white group-hover:border-[#1a1a1a]"
          >
            Launch Tool
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
