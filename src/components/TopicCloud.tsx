import React from 'react';
import { BubbleElement } from './ui/BubbleElement';
import { RotateCcw } from 'lucide-react';

interface TopicCloudProps {
  topics: string[];
  selectedTopic?: string | string[];
  selectedTopics?: string[];
  onSelect?: (topic: string) => void;
  onToggle?: (topic: string) => void;
  onReset?: () => void;
  maxHeightClass?: string;
  hideHeader?: boolean;
}

export const TopicCloud: React.FC<TopicCloudProps> = ({
  topics,
  selectedTopic,
  selectedTopics,
  onSelect,
  onToggle,
  onReset,
  maxHeightClass = 'max-h-64',
  hideHeader = false
}) => {
  // Normalize selected topics into a Set for fast lookup
  const selectedSet = React.useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(selectedTopics)) {
      selectedTopics.forEach(t => set.add(t));
    } else if (Array.isArray(selectedTopic)) {
      selectedTopic.forEach(t => set.add(t));
    } else if (typeof selectedTopic === 'string' && selectedTopic.trim()) {
      selectedTopic.split(',').forEach(t => {
        if (t.trim()) set.add(t.trim());
      });
    }
    return set;
  }, [selectedTopic, selectedTopics]);

  const handleTopicClick = (topic: string) => {
    if (onToggle) {
      onToggle(topic);
    } else if (onSelect) {
      onSelect(topic);
    }
  };

  return (
    <div className="relative w-full space-y-2">
      {/* Top Header with Selected Counter & Reset Button */}
      {!hideHeader && (onReset || selectedSet.size > 0) && (
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-foreground/70 font-medium">
            {selectedSet.size > 0 
              ? `Выбрано тем: ${selectedSet.size}` 
              : 'Нажмите для выбора одной или нескольких тем'}
          </span>
          {onReset && selectedSet.size > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all font-bold text-xs"
            >
              <RotateCcw size={13} />
              <span>Сбросить выбор</span>
            </button>
          )}
        </div>
      )}

      <div className={`flex flex-wrap items-center justify-start gap-2 p-3 rounded-2xl border border-primary/25 bg-background/20 backdrop-blur-md overflow-y-auto ${maxHeightClass} custom-scrollbar`}>
        {topics.map((topic) => {
          const isSelected = selectedSet.has(topic);
          return (
            <BubbleElement
              key={topic}
              type="button"
              active={isSelected}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleTopicClick(topic);
              }}
              className="m-0.5 text-xs font-medium normal-case transition-all duration-200"
            >
              {topic}
            </BubbleElement>
          );
        })}
      </div>
    </div>
  );
};
