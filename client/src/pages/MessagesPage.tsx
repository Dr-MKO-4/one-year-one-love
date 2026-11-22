import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircleHeart } from 'lucide-react';
import { api, type MessageMemories } from '@/services/api';
import { ChatShot } from '@/components/ChatShot';
import { Empty, Loader, Page, SectionTitle, rise, stagger } from '@/components/ui';

export function MessagesPage() {
  const [data, setData] = useState<MessageMemories | null | undefined>(undefined);

  useEffect(() => {
    api.messages().then(setData).catch(() => setData(null));
  }, []);

  if (data === undefined) return <Loader />;
  const chats = data?.published ? (data.chats ?? []).filter((c) => !c.attachTo) : [];
  const attached = data?.published ? (data.chats ?? []).filter((c) => c.attachTo) : [];

  return (
    <Page className="max-w-5xl">
      <SectionTitle kicker="Nos messages" title="Les mots qu’on s’est écrits">
        Des messages gardés, remis en forme. Le challenge des « 30 raisons », une lettre à Ursule… et quelques fous rires.
      </SectionTitle>

      {data?.published && data.excerpts.length > 0 && (
        <motion.ul variants={stagger} initial="hidden" animate="show" className="mb-10 grid gap-3 sm:grid-cols-3">
          {data.excerpts.map((e, i) => (
            <motion.li key={i} variants={rise} whileHover={{ y: -4, rotate: i % 2 ? 0.8 : -0.8 }} className="card p-5">
              <p className="font-letter text-lg italic leading-snug text-wine-800">« {e} »</p>
            </motion.li>
          ))}
        </motion.ul>
      )}

      {!chats.length && !attached.length ? (
        <Empty icon={<MessageCircleHeart className="h-6 w-6" />} title="Aucun message pour l’instant">
          Les conversations s’ajoutent dans Configuration, onglet Lettre.
        </Empty>
      ) : (
        <div className="space-y-16">
          {[...chats, ...attached].map((c) => (
            <ChatShot key={c.id} chat={c} />
          ))}
        </div>
      )}
    </Page>
  );
}
