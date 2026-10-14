# Chinese Vocabulary Training

## Overview
This application is to help the user to remember Chinese characters/words using 
different kinds of trainings or games.

## Stacks

Backend: NodeJS
Frontend: React
Database: PostgreSql

## Database
The database should hold the dictionary of the words. Each item should hold these properties:
- hanzi: the Chinese characters/word itself 
- level: the HSK level of the word
- meaning: the meaning in English
- explanation: the explanation of it
- source：this could be any string
- update_time: the last updated date/time of this entry

## Frontend

The application has a reactive page, and can be used from both a computer or a mobile device.
The minimum size is such from iPhone 16.

### Main Page
At the top of the main page is a banner with the logo, and title. 
The banner will contain links, which will turn into hamburger menu.
The main area is blank.
The links are:
- Flash Card
- Quiz
- Dictionary

### Page: Flash Card
This is the simplest form of the traning.
It show 3 cards each with a Chinese character or a word. A word can contain several chinese characters.
Under the character is a toggle button, when toggled more information will be shown:
- the pinyin
- the meaning in English
- explanation of the word

There under there's a 'next' button to show the next 3 randomized characters/words.

### Page: Quiz
In the middle of the page, a word will be shown.
Under it there are 4 choices of pinyin, and 4 choices of meaning (side by side).
The user has to choose the pinyin and meaning.
Under it there's a submit button. When clicked, it will reveal the answers.
The user has to click 'Next' button to go further.
Repeat this until the user get 10 questions (or when the dictionary contain less than 10, then until all words are questioned).
After 10 questions, make a review, which questions are good, which aren't.

### Page: Dictionary
This will be a table of all words in the dictionary. 
Each column is sortable. Above the table make a search box. When filled in it will filter the table on meaning or description.
