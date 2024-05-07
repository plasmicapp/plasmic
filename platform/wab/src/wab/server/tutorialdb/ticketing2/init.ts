import {
  Comment,
  Ticket,
  User,
} from "@/wab/server/tutorialdb/ticketing2/entities";
import { Connection } from "typeorm";

export async function initDb(con: Connection) {
  await con.query("CREATE SCHEMA If NOT EXISTS ticketing");
  await con.synchronize();
  await con.query(`
grant all on schema ticketing to public;
grant all on all tables in schema ticketing to public;
grant all on all sequences in schema ticketing to public;
grant all on all functions in schema ticketing to public;
  `);
  await con.transaction(async (mgr) => {
    const users = mgr.getRepository(User);
    const tickets = mgr.getRepository(Ticket);
    const comments = mgr.getRepository(Comment);
    const user1 = users.create({
      email: "user1@gmail.com",
      first_name: "Sarah",
      last_name: "Gonzalez",
    });
    const user2 = users.create({
      email: "user2@gmail.com",
      first_name: "Robert",
      last_name: "Smith",
    });
    const support1 = users.create({
      email: "support1@example.com",
      first_name: "Corey",
      last_name: "Bridges",
    });
    const support2 = users.create({
      email: "support2@example.com",
      first_name: "Julia",
      last_name: "Ritchey",
    });
    await mgr.save([user1, user2, support1, support2]);

    await mgr.save([
      tickets.create({
        title: "Forgotten password",
        description:
          "I've forgotten my password and can't log into my account. Can you help me reset it?",
        status: "Closed",
        created: user1,
        assigned: support1,
        created_at: "2023-11-01T09:45:33Z",
        comments: [
          comments.create({
            author_user: support1,
            comment:
              "Hello! I'm here to assist you. To start the password reset process, could you please provide me with the email address associated with your account?",
            created_at: "2023-11-01T09:50:44Z",
          }),
          comments.create({
            author_user: user1,
            comment: "Sure, it's user1@gmail.com.",
            created_at: "2023-11-01T09:55:44Z",
          }),
          comments.create({
            author_user: support1,
            comment:
              "Thank you. I've sent a password reset link to user1@gmail.com. Please check your inbox (and spam folder) and follow the instructions in the email to reset your password.",
            created_at: "2023-11-01T10:05:44Z",
          }),
          comments.create({
            author_user: user1,
            comment:
              "I've received the email and clicked the link, but it's asking for a security question answer. I don't remember what I set for that.",
            created_at: "2023-11-01T10:33:44Z",
          }),
          comments.create({
            author_user: support1,
            comment:
              "No problem. For security reasons, I can't see your security question answer. However, I can verify your identity with some additional information. Could you please provide your account's creation date or a recent transaction ID?",
            created_at: "2023-11-01T10:50:44Z",
          }),
          comments.create({
            author_user: user1,
            comment: "Actually nevermind, I just remembered the password.",
            created_at: "2023-11-01T11:45:44Z",
          }),
          comments.create({
            author_user: support1,
            comment: "Great, good luck!",
            created_at: "2023-11-01T13:50:44Z",
          }),
        ],
      }),
      tickets.create({
        title: "Issue with Software Update",
        description:
          "After the latest update, my software isn't opening. Can you help me fix this?",
        status: "Closed",
        created: user2,
        assigned: support2,
        created_at: "2023-11-02T12:30:20Z",
        comments: [
          comments.create({
            author_user: support2,
            comment:
              "Hi, I'm sorry to hear you're having issues. Can you please provide the version number of the software you updated and your operating system details?",
            created_at: "2023-11-02T12:35:15Z",
          }),
          comments.create({
            author_user: user2,
            comment:
              "Sure, I updated to version 5.2.1 and I'm using Windows 10.",
            created_at: "2023-11-02T12:45:10Z",
          }),
          comments.create({
            author_user: support2,
            comment:
              "Thank you for the information. Can you try reinstalling the software and let me know if the issue persists?",
            created_at: "2023-11-02T12:55:30Z",
          }),
          comments.create({
            author_user: user2,
            comment:
              "I reinstalled it and now it works perfectly. Thanks for the quick fix!",
            created_at: "2023-11-02T13:20:47Z",
          }),
          comments.create({
            author_user: support2,
            comment:
              "You're welcome! If you encounter any more issues, feel free to reach out. Have a great day!",
            created_at: "2023-11-02T13:35:22Z",
          }),
        ],
      }),
      tickets.create({
        title: "Question About Butter for Toast",
        description:
          "I'm looking for the best type of butter to use on toast. Any recommendations?",
        status: "Closed",
        created: user1,
        assigned: support2,
        created_at: "2023-11-04T09:00:00Z",
        comments: [
          comments.create({
            author_user: support2,
            comment:
              "Hello! For toast, a butter with a high fat content, like European-style butter, is often recommended for its rich flavor. Are you looking for any specific qualities in the butter, such as organic or salted versus unsalted?",
            created_at: "2023-11-04T09:15:00Z",
          }),
          comments.create({
            author_user: user1,
            comment:
              "Thanks for the suggestion! I prefer organic butter. Any particular brands?",
            created_at: "2023-11-04T09:30:00Z",
          }),
          comments.create({
            author_user: support2,
            comment:
              "For organic options, brands like Kerrygold, Organic Valley, and Anchor are well-regarded. They offer great flavor and are widely available.",
            created_at: "2023-11-04T09:45:00Z",
          }),
          comments.create({
            author_user: user1,
            comment: "Great, I'll check them out. Thanks for the help!",
            created_at: "2023-11-04T10:00:00Z",
          }),
          comments.create({
            author_user: support2,
            comment:
              "You're welcome! If you have any more questions or need further recommendations, feel free to ask. Enjoy your toast!",
            created_at: "2023-11-04T10:15:00Z",
          }),
        ],
      }),
      tickets.create({
        title: "Inquiry: Best Type of Chocolate",
        description:
          "There's a debate in my office about the best type of chocolate. Can you settle this once and for all?",
        status: "Closed",
        created: user2,
        assigned: support1,
        created_at: "2023-11-05T11:00:00Z",
        comments: [
          comments.create({
            author_user: support1,
            comment:
              "Hello! Settling chocolate debates is a part of our unofficial job description. The best type of chocolate is obviously the one you can't stop eating! But scientifically speaking, are we Team Milk, Dark, or White Chocolate?",
            created_at: "2023-11-05T11:15:00Z",
          }),
          comments.create({
            author_user: user2,
            comment:
              "Well, I'm on Team Milk Chocolate, but my colleague is convinced that Dark Chocolate is superior because it's healthier. Help!",
            created_at: "2023-11-05T11:30:00Z",
          }),
          comments.create({
            author_user: support1,
            comment:
              "Ah, the classic Milk vs. Dark debate! Here's a fun fact: Dark chocolate claims it's healthier, but Milk chocolate has a secret weapon – it's irresistibly delicious. However, White chocolate is just there for moral support, often forgotten but always sweet.",
            created_at: "2023-11-05T11:45:00Z",
          }),
          comments.create({
            author_user: user2,
            comment:
              "That's hilarious! I think this will definitely spice up our office debate. Thanks for the fun insights!",
            created_at: "2023-11-05T12:00:00Z",
          }),
          comments.create({
            author_user: support1,
            comment:
              "Anytime! Remember, the best chocolate is the one you enjoy the most. Unless it's the last piece – then it's a race! If you need more fun facts or assistance, feel free to reach out.",
            created_at: "2023-11-05T12:15:00Z",
          }),
        ],
      }),
      tickets.create({
        title: "Pudding vs. Meat Dilemma",
        description:
          "Is it true that I can't have any pudding if I don't eat my meat?",
        status: "In Progress",
        created: user1,
        assigned: support1,
        created_at: "2023-11-06T14:00:00Z",
        comments: [
          comments.create({
            author_user: support1,
            comment:
              "Hello! Ah, the age-old question inspired by the classic Pink Floyd song. Technically, dessert is a reward for finishing your meal, but let's dive into the philosophy behind it. Are we discussing literal meat and pudding, or is this a metaphor for life's responsibilities and rewards?",
            created_at: "2023-11-06T14:15:00Z",
          }),
          comments.create({
            author_user: user1,
            comment:
              "I was thinking more along the literal lines, but now you've got me curious about the metaphorical meaning!",
            created_at: "2023-11-06T14:30:00Z",
          }),
        ],
      }),

      tickets.create({
        title: "Almond Butter vs. Peanut Butter: Ethical Dilemma",
        description:
          "I think almond butter tastes better than peanut butter, but I'm concerned about the environmental impact since almonds require more water to grow. Is it ethical to prefer almond butter?",
        status: "In Progress",
        created: user2,
        assigned: support2,
        created_at: "2023-11-07T15:00:00Z",
        comments: [
          comments.create({
            author_user: support2,
            comment:
              "Hello! You've touched on a complex and important topic. It's true that almond cultivation requires more water, but taste preference is subjective. When considering ethics, it's also important to look at factors like your overall consumption habits, local sourcing, and sustainability practices of brands. Are there specific aspects of this dilemma you're most concerned about?",
            created_at: "2023-11-07T15:15:00Z",
          }),
          comments.create({
            author_user: user2,
            comment:
              "Thanks for the response. I'm particularly concerned about water usage and the impact on drought-prone areas. Do you have any information on how different brands address this issue?",
            created_at: "2023-11-07T15:30:00Z",
          }),
        ],
      }),

      tickets.create({
        title: "Ethical Dilemma of Eating Unicorn Meat",
        description:
          "I've been offered unicorn meat in a dream. Ethically speaking, should I accept it in my next dream?",
        status: "Open",
        created: user1,
        created_at: "2023-11-09T08:00:00Z",
      }),

      tickets.create({
        title: "Moral Implications of Stealing Candy from a Baby",
        description:
          "Is it ever justifiable to steal candy from a baby if you really, really want the candy?",
        status: "Open",
        created: user2,
        created_at: "2023-11-09T08:30:00Z",
      }),

      tickets.create({
        title: "Ethics of Time-Traveling for Breakfast",
        description:
          "If I could time travel, would it be ethical to eat breakfast twice?",
        status: "Open",
        created: user1,
        created_at: "2023-11-09T09:00:00Z",
      }),

      tickets.create({
        title: "Eating Spaghetti Without Alerting the Flying Spaghetti Monster",
        description:
          "Is it possible to eat spaghetti ethically without offending the Flying Spaghetti Monster?",
        status: "Open",
        created: user2,
        created_at: "2023-11-09T09:30:00Z",
      }),

      tickets.create({
        title: "Moral Quandary of Eating Food that Talks Back",
        description:
          "What are the ethical implications of eating food that verbally expresses its opinions?",
        status: "Open",
        created: user1,
        created_at: "2023-11-09T10:00:00Z",
      }),

      tickets.create({
        title: "Guilty Conscience for Eating Gingerbread Houses",
        description:
          "Is it morally wrong to eat a gingerbread house, considering it might be someone's dream home?",
        status: "Open",
        created: user2,
        created_at: "2023-11-09T10:30:00Z",
      }),

      tickets.create({
        title: "Ethical Debate on Eating Cookies Left for Santa",
        description:
          "Should I feel guilty for eating cookies that were clearly left out for Santa Claus?",
        status: "Open",
        created: user1,
        created_at: "2023-11-09T11:00:00Z",
      }),

      tickets.create({
        title: "Vampiric Dilemma: Ethical to Drink Synthetic Blood?",
        description:
          "As a self-identified vampire, is it more ethical to switch to synthetic blood?",
        status: "Open",
        created: user2,
        created_at: "2023-11-09T11:30:00Z",
      }),

      tickets.create({
        title: "Moral Implications of Eating Food from Animated Movies",
        description:
          "Is it ethical to crave and eat the food you see in animated movies, considering they have feelings in their universe?",
        status: "Open",
        created: user1,
        created_at: "2023-11-09T12:00:00Z",
      }),

      tickets.create({
        title: "Ethics of Eating Food That Resembles Famous Artworks",
        description:
          "Is it a form of art destruction to eat pastries that look like famous paintings?",
        status: "Open",
        created: user2,
        created_at: "2023-11-09T12:30:00Z",
      }),

      tickets.create({
        title: "Cheese Moon: Dairy or Rock?",
        description:
          "If the moon is made of cheese, does that make it a dairy product or a celestial body?",
        status: "In Progress",
        created: user1,
        created_at: "2023-11-10T08:00:00Z",
        comments: [
          comments.create({
            author_user: support1,
            comment:
              "That's one small step for man, one giant leap for dairy lovers! We're consulting our astronomers and cheese experts. Stand by!",
            created_at: "2023-11-10T08:15:00Z",
          }),
        ],
      }),

      tickets.create({
        title: "Invisible Sandwich: Nutritional Value?",
        description:
          "If I eat an invisible sandwich, does it have any calories?",
        status: "In Progress",
        created: user2,
        created_at: "2023-11-10T09:00:00Z",
        comments: [
          comments.create({
            author_user: support2,
            comment:
              "Great question! We're currently trying to locate an invisible sandwich for testing. Will update you with our findings!",
            created_at: "2023-11-10T09:20:00Z",
          }),
        ],
      }),

      tickets.create({
        title: "Teleporting Tacos: Safe to Consume?",
        description:
          "If I teleport a taco from Mexico to my location, is it still safe to eat?",
        status: "In Progress",
        created: user1,
        created_at: "2023-11-10T10:00:00Z",
        comments: [
          comments.create({
            author_user: support1,
            comment:
              "Interesting scenario! We're currently checking with our teleportation safety experts. Will get back to you soon!",
            created_at: "2023-11-10T10:15:00Z",
          }),
        ],
      }),

      tickets.create({
        title: "Time Travel and Expiration Dates",
        description:
          "If I time travel back to before my milk expired, can I still drink it?",
        status: "In Progress",
        created: user2,
        created_at: "2023-11-10T11:00:00Z",
        comments: [
          comments.create({
            author_user: support2,
            comment:
              "Time travel can be tricky! We're consulting our temporal mechanics team for an answer. Hang tight!",
            created_at: "2023-11-10T11:20:00Z",
          }),
        ],
      }),

      tickets.create({
        title: "Alien Vegetables: Safe for Human Consumption?",
        description:
          "If vegetables grown on Mars are brought back to Earth, are they safe for humans to eat?",
        status: "In Progress",
        created: user1,
        created_at: "2023-11-10T12:00:00Z",
        comments: [
          comments.create({
            author_user: support1,
            comment:
              "Out of this world question! We're in touch with our interplanetary agriculture experts. More info to come!",
            created_at: "2023-11-10T12:15:00Z",
          }),
        ],
      }),
      tickets.create({
        title: "Singing Fish Ethical Dilemma",
        description:
          "If my fish sings beautifully, is it unethical to think about frying it?",
        status: "Open",
        created: user1,
        created_at: "2023-11-11T08:00:00Z",
      }),

      tickets.create({
        title: "Invisible Fruit Ethical Consumption",
        description:
          "Is it ethical to consume fruit that turns invisible on Thursdays?",
        status: "Open",
        created: user2,
        created_at: "2023-11-11T09:00:00Z",
      }),

      tickets.create({
        title: "Giant Vegetables in Miniature Gardens",
        description:
          "Is it ethical to grow giant-sized vegetables in my miniature garden?",
        status: "Open",
        created: user1,
        created_at: "2023-11-11T10:00:00Z",
      }),

      tickets.create({
        title: "Time Machine Fridge Restock",
        description:
          "If I use a time machine to restock my fridge, is that an ethical use of time travel?",
        status: "In Progress",
        created: user2,
        assigned: support1,
        created_at: "2023-11-11T11:00:00Z",
        comments: [
          comments.create({
            author_user: support1,
            comment:
              "This is quite a unique use of a time machine. Let's check with our temporal ethics department!",
            created_at: "2023-11-11T11:10:00Z",
          }),
        ],
      }),

      tickets.create({
        title: "Telepathic Communication with Vegetables",
        description:
          "I believe I can telepathically communicate with my vegetables. Should I be concerned?",
        status: "Open",
        created: user1,
        created_at: "2023-11-11T12:00:00Z",
      }),

      tickets.create({
        title: "Mood-Changing Foods and Their Ethics",
        description:
          "Is it ethical to eat foods that change my mood dramatically?",
        status: "In Progress",
        created: user2,
        assigned: support2,
        created_at: "2023-11-11T13:00:00Z",
        comments: [
          comments.create({
            author_user: support2,
            comment:
              "Fascinating query! We're diving into the ethics of mood-altering cuisine. Stay tuned.",
            created_at: "2023-11-11T13:10:00Z",
          }),
        ],
      }),

      tickets.create({
        title: "Teleporting Food to Needy Areas",
        description:
          "Is it ethical to use teleportation to send food to needy areas around the world?",
        status: "Open",
        created: user1,
        created_at: "2023-11-11T14:00:00Z",
      }),
    ]);
  });
}
