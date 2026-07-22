import { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder, 
  AttachmentBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

import { renderTierListImage } from './renderer.js';
import { searchImages } from './imageSearch.js';

const userSelectedItems = new Map();
const userSearchSessions = new Map();
let activeChannelPanelMessage = null;

export function initDiscordBotCore({ token, clientId, stateEngine }) {
  if (!token || token.trim() === '' || token.includes('your_discord_bot_token')) {
    console.log('ℹ️ DISCORD_BOT_TOKEN not configured - Discord Bot offline.');
    return null;
  }

  console.log('🤖 Starting Discord Bot Engine (discord.js v14)...');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages
    ]
  });

  const commands = [
    new SlashCommandBuilder()
      .setName('setchannel')
      .setDescription('Admin ONLY: Set this channel as the designated Tier List publishing channel.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  ];

  const rest = new REST({ version: '10' }).setToken(token);
  (async () => {
    try {
      if (clientId) {
        console.log('🔄 Registering Application Slash Commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: commands.map(c => c.toJSON()) });
        console.log('✅ Slash Commands registered successfully.');
      }
    } catch (err) {
      console.error('⚠️ Slash command registration failed:', err.message);
    }
  })();

  client.once('ready', () => {
    console.log(`✅ Discord Bot active as: ${client.user.tag}`);
  });

  async function generateVotingComponents(tierListId, guildId) {
    const list = await stateEngine.getTierList(guildId, tierListId);
    if (!list) {
      throw new Error(`Tier list data not found on the server. If the server restarted, you may need to recreate it.`);
    }

    const components = [];

    const items = list.items || [];
    const selectOptions = items.slice(0, 25).map(item => {
      const safeName = item.name || 'Unknown Item';
      return {
        label: safeName.length > 25 ? safeName.substring(0, 23) + '..' : safeName,
        value: item.id,
        description: `Rank: Tier ${item.currentTier || 'Unranked'} (Score: ${item.averageScore?.toFixed(1) || '0.0'}/5.0)`
      };
    });

    if (selectOptions.length > 0) {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`tl_select_${tierListId}`)
        .setPlaceholder('Select an item to vote on...')
        .addOptions(selectOptions);
      components.push(new ActionRowBuilder().addComponents(selectMenu));
    }

    const tiers = list.tiers || [];
    let currentRow = new ActionRowBuilder();
    let btnCount = 0;
    const maxTiers = 15; // Max 3 rows of 5 buttons
    
    for (let i = 0; i < Math.min(tiers.length, maxTiers); i++) {
      const tier = tiers[i];
      if (btnCount === 5) {
        components.push(currentRow);
        currentRow = new ActionRowBuilder();
        btnCount = 0;
      }
      
      let style = ButtonStyle.Secondary;
      if (i === 0) style = ButtonStyle.Primary;
      else if (i === 1) style = ButtonStyle.Success;
      else if (i === tiers.length - 1) style = ButtonStyle.Danger;

      currentRow.addComponents(
        new ButtonBuilder().setCustomId(`tl_vote_${tier.id}`).setLabel(`${tier.name}`).setStyle(style)
      );
      btnCount++;
    }
    
    if (btnCount > 0) {
      components.push(currentRow);
    }

    if (list.allowCommunityAddItems !== false) {
      const addRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`tl_add_item_${tierListId}`).setLabel('Add Custom Item').setStyle(ButtonStyle.Secondary)
      );
      components.push(addRow);
    }

    const imageBuffer = await renderTierListImage(list);
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'tierlist.png' });

    const msgContent = `📊 **Live Voting Panel: ${list.title}**\n${list.subtitle}\n\n**Instructions:** Select an item from the menu below, then click a Tier button (S, A, B, C, D, F) to cast your vote.\n*(Click the image below to expand to full 1080p size!)*`;

    return { content: msgContent, components, files: [attachment] };
  }

  // Export function to allow Web App to summon the panel
  client.postTierListToChannel = async (tierListId, guildId = null) => {
    try {
      let targetChannelId = null;
      if (guildId) {
        targetChannelId = await stateEngine.getGuildConfig(guildId);
      }
      
      if (!targetChannelId) {
        const allConfigs = await stateEngine.getAllGuildConfigs();
        if (allConfigs.size > 0) {
          targetChannelId = allConfigs.values().next().value;
        }
      }

      if (!targetChannelId) {
        throw new Error('No channel configured. An admin must run /setchannel in the Discord server first.');
      }

      const channel = await client.channels.fetch(targetChannelId);
      if (!channel) return false;
      const payload = await generateVotingComponents(tierListId, guildId);
      const message = await channel.send(payload);
      activeChannelPanelMessage = message;

      const list = await stateEngine.getTierList(guildId, tierListId);
      if (list && list.enableDiscussion !== false) {
        try {
          await message.startThread({
            name: `Discussion: ${list.title.substring(0, 50)}`,
            autoArchiveDuration: 1440
          });
        } catch (threadErr) {
          console.error('Failed to create thread:', threadErr);
        }
      }

      return true;
    } catch (err) {
      console.error('Error posting to channel:', err);
      throw err;
    }
  };

  // Handle Text Commands (Fallback for Slash Command caching)
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!setchannel') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ You must be an Administrator to use this command.');
      }

      await stateEngine.setGuildConfig(message.guildId, message.channelId);
      return message.reply(`✅ This channel (<#${message.channelId}>) has been set as the designated Tier List publishing channel for this server.`);
    }
  });

  // Handle Slash Commands (Admin setup)
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'setchannel') {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ You must be an Administrator to use this command.', ephemeral: true });
      }

      await stateEngine.setGuildConfig(interaction.guildId, interaction.channelId);
      return interaction.reply({ content: `✅ This channel (<#${interaction.channelId}>) has been set as the designated Tier List publishing channel for this server.` });
    }
  });

  // Handle Image Candidate Navigation & Selection (Prev / Next / Select)
  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;
      const customId = interaction.customId;

      const userId = interaction.user.id;
      const guildId = interaction.guildId;

      if (interaction.isStringSelectMenu() && customId.startsWith('tl_select_')) {
        const activeListId = customId.replace('tl_select_', '');
        const selectedItemId = interaction.values[0];
        userSelectedItems.set(userId, { itemId: selectedItemId, tierListId: activeListId });

        const list = await stateEngine.getTierList(guildId, activeListId);
        const item = list?.items.find(i => i.id === selectedItemId);

        return interaction.reply({
          content: `Selected **${item ? item.name : selectedItemId}**. Now click a Tier button below (S, A, B, C, D, F) to record your vote.`,
          ephemeral: true
        });
      }

      if (interaction.isButton() && customId.startsWith('tl_vote_')) {
        const tier = customId.replace('tl_vote_', '');
        const selection = userSelectedItems.get(userId);

        if (!selection) {
          return interaction.reply({
            content: 'Please select an item from the dropdown menu first before clicking a tier button.',
            ephemeral: true
          });
        }

        const result = await stateEngine.recordVote({
          guildId,
          tierListId: selection.tierListId,
          itemId: selection.itemId,
          tier,
          voterId: userId,
          voterName: interaction.user.username,
          source: 'Discord Button'
        });

        if (!result.success) {
          return interaction.reply({ content: `Error: ${result.message}`, ephemeral: true });
        }

        await interaction.reply({
          content: `Vote recorded for **${result.item.name}** -> **Tier ${tier}** (Current average: ${result.item.averageScore.toFixed(2)}/5.0).`,
          ephemeral: true
        });

        if (activeChannelPanelMessage) {
          const payload = await generateVotingComponents(selection.tierListId, guildId);
          activeChannelPanelMessage.edit(payload).catch(() => {});
        }
      }

      // ---------------------------------------------------------
      // "Add Item" Flow (Discord Modals & Web Search)
      // ---------------------------------------------------------
      
      if (interaction.isButton() && customId.startsWith('tl_add_item_')) {
        const tId = customId.replace('tl_add_item_', '');
        
        userSearchSessions.set(userId, { 
          panelMessage: interaction.message,
          tierListId: tId 
        });
        const modal = new ModalBuilder()
          .setCustomId(`tl_add_modal_${tId}`)
          .setTitle('Add Item to Tier List');

        const input = new TextInputBuilder()
          .setCustomId('item_query')
          .setLabel("Image URL or Search Query")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g. Elden Ring, or paste a CDN link")
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
      }

      if (interaction.isModalSubmit() && customId.startsWith('tl_add_modal_')) {
        const tId = customId.replace('tl_add_modal_', '');
        const query = interaction.fields.getTextInputValue('item_query');
        const isUrl = query.startsWith('http://') || query.startsWith('https://');

        const session = userSearchSessions.get(userId) || { tierListId: tId };

        if (isUrl) {
          userSearchSessions.set(userId, { ...session, results: [{ title: 'Custom Image', url: query }], currentIndex: 0 });

          const embed = new EmbedBuilder()
            .setTitle('Custom Image Provided - Select Tier')
            .setImage(query)
            .setColor(0x5865f2);

          const btnRow1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tl_search_tier_S').setLabel('Add to S').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tl_search_tier_A').setLabel('Add to A').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('tl_search_tier_B').setLabel('Add to B').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('tl_search_tier_C').setLabel('Add to C').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tl_search_tier_D').setLabel('Add to D').setStyle(ButtonStyle.Secondary)
          );

          const btnRow2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tl_search_tier_F').setLabel('Add to F').setStyle(ButtonStyle.Danger)
          );

          return interaction.reply({ embeds: [embed], components: [btnRow1, btnRow2], ephemeral: true });
        } else {
          // Perform Search
          await interaction.deferReply({ ephemeral: true });
          const res = await searchImages(query);
          if (!res || res.length === 0) {
            return interaction.editReply({ content: `No images found for "${query}". Try a different search.` });
          }

          userSearchSessions.set(userId, { ...session, results: res, currentIndex: 0 });

          const img = res[0];
          const embed = new EmbedBuilder()
            .setTitle(`Result 1 of ${res.length}: ${img.title}`)
            .setImage(img.url)
            .setColor(0x5865f2);

          const btnRow1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tl_search_tier_S').setLabel('Add to S').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tl_search_tier_A').setLabel('Add to A').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('tl_search_tier_B').setLabel('Add to B').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('tl_search_tier_C').setLabel('Add to C').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tl_search_tier_D').setLabel('Add to D').setStyle(ButtonStyle.Secondary)
          );

          const btnRow2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tl_search_tier_F').setLabel('Add to F').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('tl_search_next').setLabel('Next Image ⏭️').setStyle(ButtonStyle.Primary)
          );

          return interaction.editReply({ content: 'Select a tier to add this image, or click Next to see other results.', embeds: [embed], components: [btnRow1, btnRow2] });
        }
      }

      if (interaction.isButton() && customId.startsWith('tl_search_tier_')) {
        const session = userSearchSessions.get(userId);
        if (!session) return interaction.reply({ content: 'Session expired. Try searching again.', ephemeral: true });

        const tier = customId.replace('tl_search_tier_', '');
        const img = session.results[session.currentIndex];

        await stateEngine.addItem(guildId, session.tierListId, {
          name: img.title,
          imageUrl: img.url,
          defaultTier: tier,
          currentTier: tier
        });

        if (session.panelMessage) {
          const payload = await generateVotingComponents(session.tierListId, guildId);
          session.panelMessage.edit(payload).catch(err => console.error('Failed to edit saved panel:', err.message));
        } else if (activeChannelPanelMessage) {
          const payload = await generateVotingComponents(session.tierListId, guildId);
          activeChannelPanelMessage.edit(payload).catch(err => console.error('Failed to edit global panel:', err.message));
        }

        userSearchSessions.delete(userId);
        
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: `✅ Added **${img.title}** to Tier **${tier}**!`, embeds: [], components: [] });
          } else {
            await interaction.update({ content: `✅ Added **${img.title}** to Tier **${tier}**!`, embeds: [], components: [] });
          }
        } catch (e) { console.error('Failed to update interaction:', e); }
      }

      if (interaction.isButton() && customId === 'tl_search_next') {
        const session = userSearchSessions.get(userId);
        if (!session) return interaction.reply({ content: 'Session expired. Try searching again.', ephemeral: true });

        session.currentIndex = (session.currentIndex + 1) % session.results.length;
        const img = session.results[session.currentIndex];

        const embed = new EmbedBuilder()
          .setTitle(`Result ${session.currentIndex + 1} of ${session.results.length}: ${img.title}`)
          .setImage(img.url)
          .setColor(0x5865f2);

        return interaction.update({ embeds: [embed] });
      }

    } catch (err) {
      console.error('Error handling interaction:', err);
    }
  });

  client.on('error', (err) => console.error('Discord client error:', err));
  client.login(token).catch(err => console.error('Failed to connect Discord Bot:', err.message));

  return client;
}
