import os
import json
import bcrypt
import jwt
import datetime
from functools import wraps
from dateutil import parser
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import openai

load_dotenv()

JWT_SECRET = os.getenv('JWT_SECRET', 'supersecret')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
PASSWORD_RESET_TOKEN_EXPIRY_HOURS = int(os.getenv('PASSWORD_RESET_TOKEN_EXPIRY_HOURS', '1'))

openai.api_key = OPENAI_API_KEY

DATA_DIR = 'data'
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

def load_data(filename, default=None):
    if default is None:
        default = {}
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path, 'r') as f:
            data = json.load(f)
            # Convert date strings back to datetime objects
            if filename == 'users.json':
                for user in data.values():
                    if 'createdAt' in user and isinstance(user['createdAt'], str):
                        user['createdAt'] = parser.parse(user['createdAt'])
                    if 'lastLogin' in user and user['lastLogin'] and isinstance(user['lastLogin'], str):
                        user['lastLogin'] = parser.parse(user['lastLogin'])
                    if 'lastLogout' in user and user['lastLogout'] and isinstance(user['lastLogout'], str):
                        user['lastLogout'] = parser.parse(user['lastLogout'])
                    if 'resetExpires' in user and user.get('resetExpires') and isinstance(user['resetExpires'], str):
                        user['resetExpires'] = parser.parse(user['resetExpires'])
            elif filename in ['chats.json', 'moods.json', 'notes.json', 'admin_reports.json']:
                for item in data:
                    if 'createdAt' in item and isinstance(item['createdAt'], str):
                        item['createdAt'] = parser.parse(item['createdAt'])
            return data
    return default

def save_data(filename, data):
    path = os.path.join(DATA_DIR, filename)
    # Convert datetime objects to strings for JSON serialization
    data_copy = json.loads(json.dumps(data, default=str))
    with open(path, 'w') as f:
        json.dump(data_copy, f, indent=4)

# Load initial data
users_data = load_data('users.json', {})
chats_data = load_data('chats.json', [])
moods_data = load_data('moods.json', [])
notes_data = load_data('notes.json', [])
admin_reports_data = load_data('admin_reports.json', [])

app = Flask(__name__)
CORS(app)

CATEGORY_STEPS = {
    'breathing': 'Sit comfortably and take deep, slow breaths. Inhale for 4, hold for 4, exhale for 6.',
    'sleep': 'Create a wind-down routine, avoid screens, and let your body relax before bedtime.',
    'gratitude': 'Write down three small things you are thankful for today and reflect on them.'
}

SUPPORTED_LANGUAGES = {
    'en': 'English',
    'hi': 'Hindi',
    'te': 'Telugu'
}

RESPONSE_TEMPLATES = {
    'en': {
        'sad': {
            'opening': 'I hear that you are feeling sad right now.',
            'validate': 'Your feelings are real, and it is okay to feel this when life feels heavy.',
            'action': 'Try taking three slow breaths and naming one small thing that felt a little better today.',
            'support': 'If you want, share more about what is weighing on you and I can help with a simple next step.'
        },
        'anxious': {
            'opening': 'It sounds like worry and anxiety are taking up space for you.',
            'validate': 'This can feel overwhelming, especially when your mind keeps replaying the same concerns.',
            'action': 'Pause for a moment and try a grounding exercise: notice 5 things you can see, 4 things you can touch, 3 things you can hear.',
            'support': 'You are doing the right thing by reaching out and naming how you feel.'
        },
        'stressed': {
            'opening': 'You seem stressed and under pressure.',
            'validate': 'Stress can make everything feel heavier, even small tasks.',
            'action': 'Take a short break with slow breaths, drink some water, and remind yourself that one step at a time is enough.',
            'support': 'It is okay to slow down and care for yourself right now.'
        },
        'lonely': {
            'opening': 'Feeling lonely can be hard, and I am glad you shared that.',
            'validate': 'Loneliness is a real experience, and your feelings matter.',
            'action': 'Try reaching out to one person, or write a few words about how you are feeling to help clear your mind.',
            'support': 'I am here to listen whenever you need to talk.'
        },
        'sleep': {
            'opening': 'Sleep issues can make everything else feel harder.',
            'validate': 'When rest is poor, the mind and body both struggle.',
            'action': 'Create a soothing bedtime routine and avoid screens for 30 minutes before bed.',
            'support': 'A calm evening routine can help your body prepare to relax.'
        },
        'motivated': {
            'opening': 'You are looking for motivation, and that is a strong first step.',
            'validate': 'It is normal to have days when energy feels low.',
            'action': 'Choose one small, positive action you can do right now and celebrate that progress.',
            'support': 'Small wins add up, so start with one manageable step.'
        },
        'angry': {
            'opening': 'I can hear some anger in your words.',
            'validate': 'Anger is a valid emotion, especially when things feel unfair or stressful.',
            'action': 'Try breathing slowly and describe what you are feeling in a calm sentence, even if just to yourself.',
            'support': 'Notice how your body responds, and allow yourself to respond without judgment.'
        },
        'general': {
            'opening': 'I am here to support you with kindness and practical care.',
            'validate': 'Your experience matters, and it is okay to ask for help.',
            'action': 'Describe one small thing you can do right now to feel a bit calmer or more grounded.',
            'support': 'Sharing more will help me give you a better, more specific suggestion.'
        }
    },
    'hi': {
        'sad': {
            'opening': 'मैं सुन सकता हूँ कि आप अभी उदास महसूस कर रहे हैं।',
            'validate': 'जब जीवन भारी लगे तो ऐसा महसूस करना बिल्कुल स्वाभाविक है।',
            'action': 'धीरे से तीन गहरी सांस लें और आज की कोई छोटी अच्छी बात याद करें।',
            'support': 'अगर आप चाहें तो मुझे और बताइए, मैं आपकी मदद के लिए यहाँ हूँ।'
        },
        'anxious': {
            'opening': 'ऐसा लगता है कि चिंता और घबराहट आपके साथ हैं।',
            'validate': 'यह भारी हो सकता है, विशेषकर जब दिमाग बार-बार एक ही बात पर घूमे।',
            'action': 'अब पांच चीज़ें देखें, चार चीज़ें छुएँ, तीन चीज़ें सुनें।',
            'support': 'आपने अपनी भावनाओं को साझा करके अच्छा कदम उठाया है।'
        },
        'stressed': {
            'opening': 'आप तनाव महसूस कर रहे हैं।',
            'validate': 'तनाव चीज़ों को और मुश्किल बना देता है।',
            'action': 'एक छोटा ब्रेक लें, गहरी साँसे लें और खुद से कहें कि एक-एक कदम काफी है।',
            'support': 'कुछ समय के लिए धीमा हो जाना और अपने लिए देखभाल करना ठीक है।'
        },
        'lonely': {
            'opening': 'अकेलेपन का अनुभव कठिन हो सकता है।',
            'validate': 'आपकी भावनाएँ मायने रखती हैं।',
            'action': 'किसी को संदेश भेजें या अपने विचार लिखें, इससे थोड़ा आराम मिल सकता है।',
            'support': 'मैं यहाँ हूँ और जब चाहें बात कर सकते हैं।'
        },
        'sleep': {
            'opening': 'नींद की समस्या आपके दिन को कठिन बना सकती है।',
            'validate': 'अच्छी नींद का न होना शरीर और मन दोनों को थका देता है।',
            'action': 'सोने से पहले स्क्रीन से दूर रहें और आरामदायक माहौल बनाएं।',
            'support': 'एक शांत शाम का रूटीन आपकी नींद में मदद कर सकता है।'
        },
        'motivated': {
            'opening': 'आप प्रेरणा ढूँढ़ रहे हैं, यह एक अच्छा कदम है।',
            'validate': 'हर दिन ऊर्जा अलग हो सकती है।',
            'action': 'एक छोटा लक्ष्य चुनें और उसे पूरा करने पर अपनी तारीफ करें।',
            'support': 'छोटे कदम भी बड़ी प्रगति में बदल सकते हैं।'
        },
        'angry': {
            'opening': 'मैं आपकी गुस्से की भावना सुन सकता हूँ।',
            'validate': 'गुस्सा वैध भावना है, खासकर जब चीज़ें कठिन हों।',
            'action': 'धीरे साँस लें और शांत होकर लिखने की कोशिश करें कि आप क्या महसूस कर रहे हैं।',
            'support': 'अपने आप को दोष मत दें, बस महसूस करें और आगे बढ़ने की कोशिश करें।'
        },
        'general': {
            'opening': 'मैं आपकी सहायता के लिए यहाँ हूँ।',
            'validate': 'आपकी स्थिति महत्वपूर्ण है और आपकी भावनाएँ उचित हैं।',
            'action': 'कृपया एक छोटी सी अच्छी बात लिखें जो आज आपके दिन में आई हो।',
            'support': 'और बताइए, ताकि मैं आपको और बेहतर सलाह दे सकूँ।'
        }
    },
    'te': {
        'sad': {
            'opening': 'మీకు ఇప్పుడు నెమ్మదిగా బాధగా ఉందని నేను గుర్తిస్తున్నాను.',
            'validate': 'జీవితం బరువుగా అనిపించినప్పుడు ఈ భావన సహజమే.',
            'action': 'మూడు దీర్ఘ శ్వాసలు తీసుకోండి మరియు ఈ రోజులో ఒక చిన్న మంచి విషయాన్ని గుర్తు చేసుకోండి.',
            'support': 'మీరు ఇంకా చెప్పాలనుకుంటే, నేను ఇక్కడనే ఉన్నాను.'
        },
        'anxious': {
            'opening': 'మీకు ఆందోళన అట్టడువతో ఉంది.',
            'validate': 'దీనిని అనుభవించడం భయం కాదు, ఇది చాలా సాధారణం.',
            'action': '5 విషయాలను చూడండి, 4 విషయాలను తోట్చండి, 3 శబ్దాలను వినండి.',
            'support': 'మీ భావాలను చేర్చడం ఒక మంచి మొదలు.'
        },
        'stressed': {
            'opening': 'మీరు ఒత్తిడిని అనుభవిస్తున్నారు.',
            'validate': 'ఒత్తిడి జీవితం లో ప్రతీ చిన్న విషయం ను పెద్దదిగా మారుస్తుంది.',
            'action': 'కొంచెం విశ్రాంతి తీసుకోండి, మెల్లగా శ్వాస తీసుకోండి మరియు మీకు ఇప్పుడు సరిపడేదే చేసుకోండి.',
            'support': 'మీరు ఇప్పుడు స్వయంకి శ్రద్ధ తీసుకోవడం సరే.'
        },
        'lonely': {
            'opening': 'అకలితనం కనిపించటం క్లిష్టం.',
            'validate': 'మీ భావాలు నిజమైనవి మరియు విలువైనవి.',
            'action': 'ఒకరితో మాట్లాడండి లేదా మీ భావాలను నోట్స్ లో రాయండి.',
            'support': 'నేను మీకు వినడానికి సిద్ధంగా ఉన్నాను.'
        },
        'sleep': {
            'opening': 'నిద్ర సమస్యలు మీ రోజును కష్టం చేస్తాయి.',
            'validate': 'బాగా విశ్రాంతి పొందలేకపోతే, శరీరం ఇంకా అలసిపోతుంది.',
            'action': 'బెడ్‌టైంకు ముందు స్క్రీన్ల నుంచి దూరంగా ఉండండి మరియు ఒక శాంతమైన వాతావరణం తయారుచేసుకోండి.',
            'support': 'శాంతమైన రాత్రి అలవాటు మీకు మంచి నిద్ర ఇవ్వగలదు.'
        },
        'motivated': {
            'opening': 'మీరు ప్రేరణ కోసం చూస్తున్నారు, ఇది మంచి మొదటి అడుగు.',
            'validate': 'ప్రతి రోజు మనశ్శక్తి వేరుగా ఉంటుంది.',
            'action': 'ఇప్పుడే ఒక చిన్న లక్ష్యాన్ని ఎంచుకోండి మరియు దాన్ని పూర్తి చేయడానికి ప్రయత్నించండి.',
            'support': 'చిన్న విజయం కూడా మీకు స్ఫూర్తిని అందిస్తుంది.'
        },
        'angry': {
            'opening': 'మీలో కోపం ఉంది అని నేను గమనిస్తున్నాను.',
            'validate': 'కోపం ఒక సహజమైన భావన, ఇది కూడగలదు.',
            'action': 'మెల్లగా ఊపిరి తీసుకోండి మరియు మీ అనుభూతిని ఒక సాదా వాక్యంలో వ్రాయండి.',
            'support': 'మీ భావాలను అంగీకరించడం మీకు ఉపశమనం కలిగిస్తుంది.'
        },
        'general': {
            'opening': 'నేను మీకు మద్దతుగా ఉన్నాను.',
            'validate': 'మీ అనుభవం ముఖ్యమైనది మరియు మీ భావాలు సరైనవి.',
            'action': 'ఇప్పుడే మీకు ఒక మంచి విషయం గురించి చెప్పండి.',
            'support': 'మరిన్ని వివరాలు ఐతే, నేను మీరు కోసం మరింత సహాయకరంగా ఉండగలను.'
        }
    }
}

OPENAI_ENABLED = bool(OPENAI_API_KEY)


def normalize_language(language_code):
    if not language_code:
        return 'en'
    language_code = language_code.lower()
    if language_code.startswith('hi'):
        return 'hi'
    if language_code.startswith('te'):
        return 'te'
    return 'en'


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            current_user = users_data.get(payload['email'])
            if not current_user:
                raise Exception('User not found')
        except Exception as e:
            return jsonify({'error': 'Token is invalid.', 'message': str(e)}), 401
        return f(current_user, *args, **kwargs)
    return decorated


def choose_response_topic(text):
    text = text.lower()
    if any(word in text for word in ['sad', 'depressed', 'down', 'hopeless', 'unhappy', 'cry']):
        return 'sad'
    if any(word in text for word in ['anxious', 'anxiety', 'panic', 'worried', 'fear']):
        return 'anxious'
    if any(word in text for word in ['stress', 'stressed', 'overwhelmed', 'pressure']):
        return 'stressed'
    if any(word in text for word in ['lonely', 'alone', 'isolated']):
        return 'lonely'
    if any(word in text for word in ['sleep', 'insomnia', 'restless', 'tired']):
        return 'sleep'
    if any(word in text for word in ['motivate', 'motivation', 'energy', 'drive']):
        return 'motivated'
    if any(word in text for word in ['angry', 'anger', 'frustrated', 'mad']):
        return 'angry'
    return 'general'


def generate_local_response(message, mood, language):
    topic = choose_response_topic(message)
    messages = RESPONSE_TEMPLATES.get(language, RESPONSE_TEMPLATES['en'])
    template = messages.get(topic, messages['general'])
    return (
        f"{template['opening']} {template['validate']}\n\n"
        f"{template['action']}\n\n"
        f"{template['support']}"
    )


def generate_token(user):
    payload = {
        'email': user['email'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def sentiment_from_text(text):
    text_lower = text.lower()
    if any(word in text_lower for word in ['sad', 'anxiety', 'stress', 'lonely', 'overwhelmed', 'panic']):
        return 'challenged'
    if any(word in text_lower for word in ['happy', 'calm', 'good', 'grateful', 'motivated']):
        return 'positive'
    return 'neutral'


def build_ai_prompt(message, mood, language):
    language_name = SUPPORTED_LANGUAGES.get(language, 'English')
    return (
        f"You are a compassionate, professional psychologist assistant specializing in CBT (Cognitive Behavioral Therapy). "
        f"Respond in {language_name}. Use simple, clear language and short sentences. "
        f"Validate the user's feelings, summarize their concern, and offer one practical coping step. "
        f"If the user mentions stress, anxiety, sadness, or sleep difficulty, include one calming breathing exercise, self-compassion phrase, or grounding strategy. "
        f"Format answers with an empathetic opening, a clear explanation, and one gentle action step. "
        f"Use bullet points or numbered items only if that makes the response easier to follow. "
        f"If the user asks for mood support, respond with reassurance and a useful next step. "
        f"The user's current mood is {mood}. "
        f"User message: {message}. "
        f"Write a helpful answer in {language_name}."
    )


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json or {}
    email = data.get('email')
    name = data.get('name')
    password = data.get('password')
    if not email or not password or not name:
        return jsonify({'error': 'Name, email, and password are required.'}), 400
    if email in users_data:
        return jsonify({'error': 'Email already registered.'}), 400
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    user = {
        'name': name,
        'email': email,
        'password': password_hash.decode('utf-8'),  # Store as string for JSON
        'createdAt': datetime.datetime.utcnow(),
        'lastLogin': None,
        'lastLogout': None,
        'role': 'user',
        'profile': {
            'language': 'en',
            'wellnessScore': 78,
            'favoriteActivities': []
        }
    }
    users_data[email] = user
    save_data('users.json', users_data)
    token = generate_token(user)
    return jsonify({'token': token, 'user': {'email': email, 'name': name}})


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get('email')
    password = data.get('password')
    user = users_data.get(email)
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        return jsonify({'error': 'Invalid credentials.'}), 401
    user['lastLogin'] = datetime.datetime.utcnow()
    save_data('users.json', users_data)
    token = generate_token(user)
    return jsonify({'token': token, 'user': {'email': email, 'name': user['name'], 'role': user.get('role', 'user'), 'profile': user.get('profile', {})}})


@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout(current_user):
    current_user['lastLogout'] = datetime.datetime.utcnow()
    save_data('users.json', users_data)
    return jsonify({'message': 'Logged out successfully.'})


@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json or {}
    email = data.get('email')
    if not email:
        return jsonify({'error': 'Email required.'}), 400
    user = users_data.get(email)
    if not user:
        return jsonify({'message': 'If the email is registered, a reset link has been sent.'})
    token = jwt.encode({
        'email': email,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=PASSWORD_RESET_TOKEN_EXPIRY_HOURS)
    }, JWT_SECRET, algorithm='HS256')
    user['resetToken'] = token
    user['resetExpires'] = datetime.datetime.utcnow() + datetime.timedelta(hours=PASSWORD_RESET_TOKEN_EXPIRY_HOURS)
    save_data('users.json', users_data)
    return jsonify({'message': 'Password reset token generated. Use /api/auth/reset-password to complete the flow.', 'resetToken': token})


@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.json or {}
    token = data.get('token')
    password = data.get('password')
    if not token or not password:
        return jsonify({'error': 'Token and new password are required.'}), 400
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        email = payload['email']
    except Exception:
        return jsonify({'error': 'Invalid or expired token.'}), 401
    user = users_data.get(email)
    if not user or user.get('resetToken') != token:
        return jsonify({'error': 'Invalid reset token.'}), 401
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user['password'] = password_hash
    if 'resetToken' in user:
        del user['resetToken']
    if 'resetExpires' in user:
        del user['resetExpires']
    save_data('users.json', users_data)
    return jsonify({'message': 'Password has been reset successfully.'})


@app.route('/api/profile', methods=['GET'])
@token_required
def profile(current_user):
    return jsonify({
        'profile': current_user.get('profile', {}),
        'email': current_user['email'],
        'name': current_user['name'],
        'role': current_user.get('role', 'user')
    })


@app.route('/api/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.json or {}
    profile_updates = data.get('profile', {})
    current_user['profile'] = profile_updates
    save_data('users.json', users_data)
    return jsonify({'message': 'Profile updated.'})


@app.route('/api/mood', methods=['POST'])
@token_required
def add_mood(current_user):
    data = request.json or {}
    mood = data.get('mood')
    note = data.get('note', '')
    if not mood:
        return jsonify({'error': 'Mood selection required.'}), 400
    mood_record = {
        'email': current_user['email'],
        'mood': mood,
        'note': note,
        'createdAt': datetime.datetime.utcnow()
    }
    moods_data.append(mood_record)
    save_data('moods.json', moods_data)
    return jsonify({'message': 'Mood saved.', 'mood': mood_record})


@app.route('/api/mood/history', methods=['GET'])
@token_required
def mood_history(current_user):
    user_moods = [r for r in moods_data if r['email'] == current_user['email']]
    sorted_moods = sorted(user_moods, key=lambda x: x['createdAt'], reverse=True)[:50]
    for r in sorted_moods:
        r['createdAt'] = r['createdAt'].isoformat()
    return jsonify({'history': sorted_moods})


@app.route('/api/chat', methods=['POST'])
@token_required
def chat(current_user):
    data = request.json or {}
    message = data.get('message', '')
    mood = data.get('mood', 'neutral')
    requested_language = normalize_language(data.get('language') or current_user.get('profile', {}).get('language', 'en'))
    sentiment = sentiment_from_text(message)
    reply = None

    if OPENAI_ENABLED:
        try:
            prompt = build_ai_prompt(message, mood, requested_language)
            response = openai.ChatCompletion.create(
                model='gpt-4o-mini',
                messages=[{'role': 'system', 'content': prompt}, {'role': 'user', 'content': message}],
                max_tokens=260,
                temperature=0.7
            )
            reply = response.choices[0].message.content.strip()
        except Exception:
            reply = generate_local_response(message, mood, requested_language)
    else:
        reply = generate_local_response(message, mood, requested_language)

    chat_doc = {
        'email': current_user['email'],
        'message': message,
        'reply': reply,
        'mood': mood,
        'sentiment': sentiment,
        'language': requested_language,
        'createdAt': datetime.datetime.utcnow()
    }
    chats_data.append(chat_doc)
    save_data('chats.json', chats_data)
    return jsonify({
        'reply': reply,
        'sentiment': sentiment,
        'language': requested_language,
        'recommendation': CATEGORY_STEPS.get('breathing')
    })


@app.route('/api/wellness', methods=['GET'])
@token_required
def wellness_tools(current_user):
    now = datetime.datetime.utcnow()
    quote_list = [
        'A healthy mind is a peaceful mind.',
        'Every step toward self-care is strength.',
        'Breathe. Reflect. Be gentle with yourself.'
    ]
    return jsonify({
        'quote': quote_list[now.day % len(quote_list)],
        'affirmation': 'You are allowed to take moments for yourself today.',
        'tips': [
            'Try a 5-minute grounding exercise.',
            'Write one thing you accomplished today.',
            'Take a break from screens and breathe deeply.'
        ]
    })


@app.route('/api/admin/users', methods=['GET'])
@token_required
def admin_users(current_user):
    if current_user.get('role') != 'admin':
        return jsonify({'error': 'Admin access required.'}), 403
    user_list = []
    for user in users_data.values():
        user_list.append({'email': user['email'], 'name': user['name'], 'role': user.get('role', 'user'), 'createdAt': user['createdAt'].isoformat() if user.get('createdAt') else ''})
    return jsonify({'users': user_list})


@app.route('/api/admin/analytics', methods=['GET'])
@token_required
def admin_analytics(current_user):
    if current_user.get('role') != 'admin':
        return jsonify({'error': 'Admin access required.'}), 403
    total_users = len(users_data)
    total_chats = len(chats_data)
    today = datetime.datetime.utcnow().date()
    today_logins = sum(
        1 for user in users_data.values()
        if user.get('lastLogin') and getattr(user['lastLogin'], 'date', lambda: None)() == today
    )
    today_logouts = sum(
        1 for user in users_data.values()
        if user.get('lastLogout') and getattr(user['lastLogout'], 'date', lambda: None)() == today
    )
    return jsonify({
        'totalUsers': total_users,
        'totalChats': total_chats,
        'todayLogins': today_logins,
        'todayLogouts': today_logouts
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
