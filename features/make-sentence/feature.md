# Feature: Sentences

## Description

This is a rather advance exercise. This exercise is accesable through the menu 'Sentences',
placed between the menu 'Quiz' and 'Dictionary'. As always it will ask the user to filter the dictionary.
This is how it goes:
- On the play area in the middle of the screen the app will select a random Chinese word
- Right under the word, give the meaning and pinyin, in the same one line
- Right under it a chatbox like area (like WhatsApp). Here Claude will interact with the user. 
- Claude will first ask the user to translate an English sentence to Chinese. This sentence will incorporate
  the chosen Chinese word chosen by the app (but then in English)
- User will iterate with Claude until Claude satisfied with the Chinese translation
- Then, the user can choose either to get the next round, or change the filter

## Requirement
- The function to interact with Claude should be made into separate file
- The sentence should be simple enough for beginners. You can sometimes use sub-clauses.
- The sentences should be no more difficult than B2 level
- User can also ask for hints or translation of specific word in the chat
- User can also say that they give up, then Claude will provide the answer
- When the user gives up, it will decrease the confidence normally
- When the user give the right answer, it will increase the confidence by a factor of 1.5