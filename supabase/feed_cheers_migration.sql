CREATE TABLE public.feed_cheers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_item_key TEXT NOT NULL,
  cheered_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(feed_item_key, cheered_by_profile_id)
);

CREATE INDEX ON public.feed_cheers (feed_item_key);
CREATE INDEX ON public.feed_cheers (cheered_by_profile_id);

ALTER TABLE public.feed_cheers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can cheer"
  ON public.feed_cheers FOR INSERT WITH CHECK (auth.uid() = cheered_by_profile_id);

CREATE POLICY "Anyone can uncheer"
  ON public.feed_cheers FOR DELETE USING (auth.uid() = cheered_by_profile_id);

CREATE POLICY "Anyone can read cheers"
  ON public.feed_cheers FOR SELECT USING (true);
