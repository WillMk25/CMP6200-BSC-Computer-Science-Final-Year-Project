// FoodFlag Cross Reactivity Map:

const CROSS_REACTIVITY_MAP = {
    // Source: allergyuk.org/resources/reactions-to-legumes/
    'peanut': ['lentil', 'chickpea', 'pea', 'lupin', 'soy', 'soya', 'bean'],
    // Source: allergyuk.org/resources/reactions-to-legumes/
    'soy': ['peanut', 'lentil', 'chickpea', 'pea', 'lupin', 'bean'],
    // Source: allergyuk.org/resources/reactions-to-legumes/
    'lupin': ['peanut', 'soy', 'soya', 'lentil', 'chickpea', 'pea'],
    // Source: allergyuk.org/resources/oral-allergy-syndrome-pollen-food-syndrome-factsheet/
    'latex': ['banana', 'avocado', 'kiwi', 'chestnut', 'papaya', 'mango', 'tomato', 'potato'],
    // Source: allergyuk.org/for-healthcare-professionals/birch-pollen-hcp/
    'birch pollen': ['apple', 'pear', 'cherry', 'peach', 'plum', 'apricot', 'kiwi', 'hazelnut', 'almond', 'walnut', 'carrot', 'celery', 'parsley'],
    // Source: allergyuk.org/resources/oral-allergy-syndrome-pollen-food-syndrome-factsheet/
    'grass pollen': ['peach', 'tomato', 'melon', 'watermelon', 'orange', 'celery'],
    // Source: allergyuk.org/resources/cows-milk-allergy/
    'milk': ['goat milk', 'sheep milk', 'mare milk', 'buffalo milk'],
    // Source: allergyuk.org/resources/tree-nut-allergy/
    'hazelnut': ['almond', 'walnut', 'cashew', 'pecan', 'brazil nut', 'pistachio'],'cashew': ['pistachio', 'mango', 'hazelnut'],
    'walnut': ['pecan', 'hazelnut', 'almond'],'almond': ['peach', 'apricot', 'cherry', 'plum', 'hazelnut'],
    // Source: food.gov.uk/safety-hygiene/14-allergens
    'wheat': ['barley', 'rye', 'oat'],
    // Source: allergyuk.org/resources/shellfish-allergy/
    'shrimp': ['crab', 'lobster', 'prawn', 'crayfish'],
    'crab': ['shrimp', 'lobster', 'prawn', 'crayfish'],
    // Source: allergyuk.org/resources/celery-allergy/
    'celery': ['carrot', 'parsley', 'coriander', 'fennel', 'dill', 'cumin', 'anise'],
    // Source: allergyuk.org/resources/mustard-allergy/
    'mustard': ['rapeseed', 'canola', 'cabbage', 'broccoli', 'cauliflower', 'horseradish', 'turnip'],
    // Source: allergyuk.org/resources/sesame-allergy/
    'sesame': ['poppy seed', 'sunflower seed', 'pumpkin seed', 'kiwi'],
};
