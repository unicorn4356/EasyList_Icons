// backend/routes/listRoutes.js

import express from 'express';
import Word from '../models/wordModel.js';
import List from '../models/listModel.js';
import Icon from '../models/iconModel.js';
import { getIconDatafromAPI } from '../controller/IconApi.js';
import { authMiddleware , checkListAccess} from '../auth.js';

const router = express.Router();

// Funktion zur Erstellung einer Liste für einen Benutzer
const createList = async (listName, userId) => {
  try {
    console.log(`Creating list with name: ${listName} for userId: ${userId}`);
    const newList = await List.create({
      list_name: listName,
      l_user_id: userId,
    });
    console.log('List created successfully:', newList);
    return newList;
  } catch (error) {
    console.error('Error creating list:', error);
    throw error;
  }
};

router.post('/', authMiddleware, async (req, res) => {
  const { listName } = req.body;
  const userId = req.user.userId; // Benutzer-ID aus dem Token

  try {
    console.log(`Creating list in database for userId: ${userId} with listName: ${listName}`);
    // Hier erfolgt die Erstellung der Liste in der Datenbank
    const newList = await createList(listName, userId);
    res.status(201).json(newList);
  } catch (error) {
    console.error('Fehler beim Erstellen der Liste:', error);
    res.status(500).json({ error: 'Interner Serverfehler beim Erstellen der Liste' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const userLists = await List.findAll({ where: { l_user_id: userId } });
    console.log('User lists fetched successfully.');
    res.status(200).json({ lists: userLists });
  } catch (error) {
    console.error('Fehler beim Abrufen der Listen des Benutzers:', error);
    res.status(500).json({ error: 'Interner Serverfehler beim Abrufen der Listen' });
  }
});

router.post('/:listId/words', authMiddleware, async (req, res) => {
  console.log('Word Name:', req.body.keyword);
  const { listId } = req.params;
  const { keyword } = req.body;

  try {
    const word = await Word.create({
      word_name: keyword,
      w_list_id: listId,
    });

    res.status(201).json(word);
  } catch (error) {
    console.error('Error creating word:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:listId/words', authMiddleware, async (req, res) => {
  const { listId } = req.params;

  console.log(`Fetching words for listId: ${listId}`);

  try {
    const words = await Word.findAll({ where: { w_list_id: listId } });
    if (!words || words.length === 0) {
      console.log(`No words found for listId: ${listId}`);
      return res.status(404).json({ message: 'No words found for this list' });
    }
    res.status(200).json({ words });
  } catch (error) {
    console.error('Error fetching words:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
//-------------------------------------------------------------------

router.put('/:listId/words/:wordId', authMiddleware, async (req, res) => {
  const { listId, wordId } = req.params;
  const { completed } = req.body;

  try {
   
    const [updated] = await Word.update(
      { 
        completed, 
        updated_at: new Date() 
      }, 
      { where: { word_id: wordId, w_list_id: listId } }
    );

    if (updated) {
      res.status(200).send({ success: true });
    } else {
      res.status(404).send('Word not found');
    }
  } catch (error) {
    console.error('Error updating word status:', error);
    res.status(500).send('Error updating status');
  }
});

router.put('/:listId/icons/:iconId', authMiddleware, async (req, res) => {
  const { listId, iconId } = req.params;
  const { completed } = req.body;

  try {
   
    const [updated] = await Icon.update(
      { 
        completed, 
        updated_at: new Date() 
      }, 
      { where: { icon_id: iconId, i_list_id: listId } }
    );

    if (updated) {
      res.status(200).send({ success: true });
    } else {
      res.status(404).send('Word not found');
    }
  } catch (error) {
    console.error('Error updating word status:', error);
    res.status(500).send('Error updating status');
  }
});

router.delete('/:listId/words/:wordId', authMiddleware, async (req, res) => {
  const { listId, wordId } = req.params;

  try {
    const deleted = await Word.destroy({
      where: { word_id: wordId, w_list_id: listId }
    });

    if (deleted) {
      res.status(200).send({ success: true });
    } else {
      res.status(404).send('Word not found');
    }
  } catch (error) {
    console.error('Error deleting word:', error);
    res.status(500).send('Error deleting word');
  }
});

router.delete('/:listId/icons/:iconId', authMiddleware,  async (req, res) => {
  const { listId, iconId } = req.params;

  try {
    const deleted = await Icon.destroy({
      where: { icon_id: iconId, i_list_id: listId }
    });

    if (deleted) {
      res.status(200).send({ success: true });
    } else {
      res.status(404).send('Icon not found');
    }
  } catch (error) {
    console.error('Error deleting icon:', error);
    res.status(500).send('Error deleting icon');
  }
});


router.delete('/:listId', authMiddleware, checkListAccess, async (req, res) => {
  const { listId } = req.params;
  const userId = req.user.userId; // Hole die userId aus dem Token

  try {
    // Lösche die Liste nur, wenn sie dem authentifizierten Nutzer gehört
    const deleted = await List.destroy({
      where: {
        list_id: listId, // Löschen der Liste basierend auf der listId
        l_user_id: userId, // Stelle sicher, dass die Liste dem Nutzer gehört
      },
    });

    if (deleted) {
      res.status(200).send({ success: true });
    } else {
      res.status(404).send('List not found or does not belong to the user');
    }
  } catch (error) {
    console.error('Error deleting list:', error);
    res.status(500).send('Error deleting list');
  }
});



//-------------------------------------------------------------------

router.post('/:listId/icons', authMiddleware, async (req, res) => {
  const { listId } = req.params;
  const { keyword } = req.body; // listId sollte vom Frontend gesendet werden

  if (!keyword || !listId) {
      return res.status(400).send('keyword and listId are required');
  }
  console.log('Empfangenes keyword und listId:', keyword, listId);

  let iconName;
  let iconSvg;
  
  try {
        const iconData = await getIconDatafromAPI(keyword);

        if (iconData && iconData.iconName && iconData.iconSvg) {
            iconName = iconData.iconName;
            iconSvg = iconData.iconSvg;
            console.log('Icon Name:', iconName);
            console.log('Icon SVG:', iconSvg);
        } else {
            console.log('No icon data was returned.');
            return res.status(404).send('Icon data not found');
        }

      const newIcon = await Icon.create({ i_list_id: listId, icon_name: iconName, icon_svg: iconSvg });

      // Erfolgreiche Antwort mit dem erstellten Icon zurückgeben
      res.status(201).json(newIcon);
  } catch (error) {
      console.error('Fehler beim Verarbeiten des Icons:', error);
      res.status(500).send('Interner iconRoute-1 Serverfehler');
  }
});

router.get('/:listId/icons', authMiddleware, async (req, res) => {
  const { listId } = req.params;

  console.log(`Fetching icons for listId: ${listId}`);

  try {
    const icons = await Icon.findAll({ where: { i_list_id: listId } });
    if (!icons || icons.length === 0) {
      console.log(`No icons found for listId: ${listId}`);
      return res.status(404).json({ message: 'No icons found for this list' });
    }
    res.status(200).json({ icons });
  } catch (error) {
    console.error('Error fetching icons:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


export default router;
