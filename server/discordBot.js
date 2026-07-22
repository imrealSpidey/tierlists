import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';

export function initDiscordBot({ token, recordVote, getTierList }) {
  if (!token || token.trim() === '' || token === 'your_discord_bot_token_here') {
    console.log('ℹ️ DISCORD_BOT_TOKEN not configured in .env - Skipping live Discord Bot login.');
    return null;
  }

  console.log('🤖 Initializing Real Discord Bot Client with discord.js...');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  client.once('ready', () => {
    console.log(`✅ Discord Bot logged in successfully as: ${client.user.tag}`);
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const text = message.content.trim();

    // 1. Command: !vote [Item] [Tier] or !tier [Item] [Tier]
    const voteMatch = text.match(/^!(?:vote|tier)\s+(.+)\s+([sSaAbBcCdDfF])$/i);

    if (voteMatch) {
      const itemName = voteMatch[1].trim();
      const tier = voteMatch[2].toUpperCase().trim();
      const voterName = message.author.username;

      const result = recordVote({
        tierListId: 'prog-2026', // Default or active list
        itemName,
        tier,
        voterName,
        source: 'Discord Bot'
      });

      if (!result.success) {
        return message.reply(`⚠️ **TierLive Bot Error:** ${result.message}`);
      }

      const item = result.item;
      const tierColors = {
        S: 0xff79c6,
        A: 0xffb86c,
        B: 0xf1fa8c,
        C: 0x50fa7b,
        D: 0x8be9fd,
        F: 0xff5555
      };

      const embed = new EmbedBuilder()
        .setTitle(`🏆 Vote Recorded: ${item.name} -> Tier [${tier}]`)
        .setDescription(`**@${voterName}** voted **${item.name}** into **Tier ${tier}**!`)
        .setColor(tierColors[tier] || 0xbd93f9)
        .addFields(
          { name: 'Average Rating', value: `⭐ **${item.averageScore.toFixed(2)}** / 5.0`, inline: true },
          { name: 'Total Votes', value: `👥 **${item.totalVotes}**`, inline: true },
          { name: 'Current Tier Placement', value: `🏅 **Tier ${item.currentTier}**`, inline: true }
        )
        .setFooter({ text: 'TierLive Real-Time Dynamic Tier List Engine' })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // 2. Command: !tierlist or !rankings
    if (text.toLowerCase() === '!tierlist' || text.toLowerCase() === '!rankings') {
      const list = getTierList('prog-2026');
      if (!list) return message.reply('Tier list unavailable.');

      const embed = new EmbedBuilder()
        .setTitle(`📊 Live Tier List Rankings: ${list.title}`)
        .setDescription(list.subtitle)
        .setColor(0xbd93f9);

      list.tiers.forEach((tierRow) => {
        const items = list.items.filter(i => i.currentTier === tierRow.id);
        const itemNames = items.length > 0 
          ? items.map(i => `${i.icon} **${i.name}** (⭐${i.averageScore.toFixed(1)})`).join(' • ')
          : '_No items_';

        embed.addFields({ name: `Tier ${tierRow.id}`, value: itemNames, inline: false });
      });

      return message.reply({ embeds: [embed] });
    }
  });

  client.login(token).catch((err) => {
    console.error('❌ Failed to login Discord Bot:', err.message);
  });

  return client;
}
