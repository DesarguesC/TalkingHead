import { pinyin } from "pinyin-pro";
/**
* @class English lip-sync processor
* @author Mika Suominen
*/

class LipsyncZh {

  /**
  * @constructors
  */
  constructor() {

    // English words to Oculus visemes, algorithmic rules adapted from:
    //   NRL Report 7948, "Automatic Translation of English Text to Phonetics by Means of Letter-to-Sound Rules" (1976)
    //   by HONEY SUE ELOVITZ, RODNEY W. JOHNSON, ASTRID McHUGH, AND JOHN E. SHORE
    //   Available at: https://apps.dtic.mil/sti/pdfs/ADA021929.pdf
    this.rules = {
      'A': [
        "[A] =aa", " [ARE] =aa RR", " [AR]O=aa RR", "[AR]#=E RR",
        " ^[AS]#=E SS", "[A]WA=aa", "[AW]=aa", " :[ANY]=E nn I",
        "[A]^+#=E", "#:[ALLY]=aa nn I", " [AL]#=aa nn", "[AGAIN]=aa kk E nn",
        "#:[AG]E=I kk", "[A]^+:#=aa", ":[A]^+ =E", "[A]^%=E",
        " [ARR]=aa RR", "[ARR]=aa RR", " :[AR] =aa RR", "[AR] =E",
        "[AR]=aa RR", "[AIR]=E RR", "[AI]=E", "[AY]=E", "[AU]=aa",
        "#:[AL] =aa nn", "#:[ALS] =aa nn SS", "[ALK]=aa kk", "[AL]^=aa nn",
        " :[ABLE]=E PP aa nn", "[ABLE]=aa PP aa nn", "[ANG]+=E nn kk", "[A]=aa"
      ],

      'B': [
        " [BE]^#=PP I", "[BEING]=PP I I nn", " [BOTH] =PP O TH",
        " [BUS]#=PP I SS", "[BUIL]=PP I nn", "[B]=PP"
      ],

      'C': [
        " [CH]^=kk", "^E[CH]=kk", "[CH]=CH", " S[CI]#=SS aa",
        "[CI]A=SS", "[CI]O=SS", "[CI]EN=SS", "[C]+=SS",
        "[CK]=kk", "[COM]%=kk aa PP", "[C]=kk"
      ],

      'D': [
        "#:[DED] =DD I DD", ".E[D] =DD", "#^:E[D] =DD", " [DE]^#=DD I",
        " [DO] =DD U", " [DOES]=DD aa SS", " [DOING]=DD U I nn",
        " [DOW]=DD aa", "[DU]A=kk U", "[D]=DD"
      ],

      'E': [
        "#:[E] =", "'^:[E] =", " :[E] =I", "#[ED] =DD", "#:[E]D =",
        "[EV]ER=E FF", "[E]^%=I", "[ERI]#=I RR I", "[ERI]=E RR I",
        "#:[ER]#=E", "[ER]#=E RR", "[ER]=E", " [EVEN]=I FF E nn",
        "#:[E]W=", "@[EW]=U", "[EW]=I U", "[E]O=I", "#:&[ES] =I SS",
        "#:[E]S =", "#:[ELY] =nn I", "#:[EMENT]=PP E nn DD", "[EFUL]=FF U nn",
        "[EE]=I", "[EARN]=E nn", " [EAR]^=E", "[EAD]=E DD", "#:[EA] =I aa",
        "[EA]SU=E", "[EA]=I", "[EIGH]=E", "[EI]=I", " [EYE]=aa", "[EY]=I",
        "[EU]=I U", "[E]=E"
      ],

      'F': [
        "[FUL]=FF U nn", "[F]=FF"
      ],

      'G': [
        "[GIV]=kk I FF", " [G]I^=kk", "[GE]T=kk E", "SU[GGES]=kk kk E SS",
        "[GG]=kk", " B#[G]=kk", "[G]+=kk", "[GREAT]=kk RR E DD",
        "#[GH]=", "[G]=kk"
      ],

      'H': [
        " [HAV]=I aa FF", " [HERE]=I I RR", " [HOUR]=aa EE", "[HOW]=I aa",
        "[H]#=I", "[H]="
      ],

      'I': [
        " [IN]=I nn", " [I] =aa", "[IN]D=aa nn", "[IER]=I E",
        "#:R[IED] =I DD", "[IED] =aa DD", "[IEN]=I E nn", "[IE]T=aa E",
        " :[I]%=aa", "[I]%=I", "[IE]=I", "[I]^+:#=I", "[IR]#=aa RR",
        "[IZ]%=aa SS", "[IS]%=aa SS", "[I]D%=aa", "+^[I]^+=I",
        "[I]T%=aa", "#^:[I]^+=I", "[I]^+=aa", "[IR]=E", "[IGH]=aa",
        "[ILD]=aa nn DD", "[IGN] =aa nn", "[IGN]^=aa nn", "[IGN]%=aa nn",
        "[IQUE]=I kk", "[I]=I"
      ],

      'J': [
        "[J]=kk"
      ],

      'K': [
        " [K]N=", "[K]=kk"
      ],

      'L': [
        "[LO]C#=nn O", "L[L]=", "#^:[L]%=aa nn", "[LEAD]=nn I DD", "[L]=nn"
      ],

      'M': [
        "[MOV]=PP U FF", "[M]=PP"
      ],

      'N': [
        "E[NG]+=nn kk", "[NG]R=nn kk", "[NG]#=nn kk", "[NGL]%=nn kk aa nn",
        "[NG]=nn", "[NK]=nn kk", " [NOW] =nn aa", "[N]=nn"
      ],

      'O': [
        "[OF] =aa FF", "[OROUGH]=E O", "#:[OR] =E", "#:[ORS] =E SS",
        "[OR]=aa RR", " [ONE]=FF aa nn", "[OW]=O", " [OVER]=O FF E",
        "[OV]=aa FF", "[O]^%=O", "[O]^EN=O", "[O]^I#=O", "[OL]D=O nn",
        "[OUGHT]=aa DD", "[OUGH]=aa FF", " [OU]=aa", "H[OU]S#=aa",
        "[OUS]=aa SS", "[OUR]=aa RR", "[OULD]=U DD", "^[OU]^L=aa",
        "[OUP]=U OO", "[OU]=aa", "[OY]=O", "[OING]=O I nn", "[OI]=O",
        "[OOR]=aa RR", "[OOK]=U kk", "[OOD]=U DD", "[OO]=U", "[O]E=O",
        "[O] =O", "[OA]=O", " [ONLY]=O nn nn I", " [ONCE]=FF aa nn SS",
        "[ON'T]=O nn DD", "C[O]N=aa", "[O]NG=aa", " ^:[O]N=aa",
        "I[ON]=aa nn", "#:[ON] =aa nn", "#^[ON]=aa nn", "[O]ST =O",
        "[OF]^=aa FF", "[OTHER]=aa TH E", "[OSS] =aa SS", "#^:[OM]=aa PP",
        "[O]=aa"
      ],

      'P': [
        "[PH]=FF", "[PEOP]=PP I PP", "[POW]=PP aa", "[PUT] =PP U DD",
        "[P]=PP"
      ],

      'Q': [
        "[QUAR]=kk FF aa RR", "[QU]=kk FF", "[Q]=kk"
      ],

      'R': [
        " [RE]^#=RR I", "[R]=RR"
      ],

      'S': [
        "[SH]=SS", "#[SION]=SS aa nn", "[SOME]=SS aa PP", "#[SUR]#=SS E",
        "[SUR]#=SS E", "#[SU]#=SS U", "#[SSU]#=SS U", "#[SED] =SS DD",
        "#[S]#=SS", "[SAID]=SS E DD", "^[SION]=SS aa nn", "[S]S=",
        ".[S] =SS", "#:.E[S] =SS", "#^:##[S] =SS", "#^:#[S] =SS",
        "U[S] =SS", " :#[S] =SS", " [SCH]=SS kk", "[S]C+=",
        "#[SM]=SS PP", "#[SN]'=SS aa nn", "[S]=SS"
      ],

      'T': [
        " [THE] =TH aa", "[TO] =DD U", "[THAT] =TH aa DD", " [THIS] =TH I SS",
        " [THEY]=TH E", " [THERE]=TH E RR", "[THER]=TH E", "[THEIR]=TH E RR",
        " [THAN] =TH aa nn", " [THEM] =TH E PP", "[THESE] =TH I SS",
        " [THEN]=TH E nn", "[THROUGH]=TH RR U", "[THOSE]=TH O SS",
        "[THOUGH] =TH O", " [THUS]=TH aa SS", "[TH]=TH", "#:[TED] =DD I DD",
        "S[TI]#N=CH", "[TI]O=SS", "[TI]A=SS", "[TIEN]=SS aa nn",
        "[TUR]#=CH E", "[TU]A=CH U", " [TWO]=DD U", "[T]=DD"
      ],

      'U': [
        " [UN]I=I U nn", " [UN]=aa nn", " [UPON]=aa PP aa nn",
        "@[UR]#=U RR", "[UR]#=I U RR", "[UR]=E", "[U]^ =aa",
        "[U]^^=aa", "[UY]=aa", " G[U]#=", "G[U]%=", "G[U]#=FF",
        "#N[U]=I U", "@[U]=I", "[U]=I U"
      ],

      'V': [
        "[VIEW]=FF I U", "[V]=FF"
      ],

      'W': [
        " [WERE]=FF E", "[WA]S=FF aa", "[WA]T=FF aa", "[WHERE]=FF E RR",
        "[WHAT]=FF aa DD", "[WHOL]=I O nn", "[WHO]=I U", "[WH]=FF",
        "[WAR]=FF aa RR", "[WOR]^=FF E", "[WR]=RR", "[W]=FF"
      ],

      'X': [
        " [X]=SS", "[X]=kk SS"
      ],

      'Y': [
        "[YOUNG]=I aa nn", " [YOU]=I U", " [YES]=I E SS", " [Y]=I",
        "#^:[Y] =I", "#^:[Y]I=I", " :[Y] =aa", " :[Y]#=aa",
        " :[Y]^+:#=I", " :[Y]^#=I", "[Y]=I"
      ],

      'Z': [
        "[Z]=SS"
      ],
    };
    this.CH_INITIALS = {
        "ZH": "SS",
        "CH": "SS",
        "SH": "SS",
        "B": "PP",
        "P": "PP",
        "M": "PP",
        "F": "FF",
        "D": "DD",
        "T": "DD",
        "N": "nn",
        "L": "nn",
        "G": "kk",
        "K": "kk",
        "H": "kk",
        "J": "CH",    // 更接近 ch
        "Q": "CH",    // 更接近 ch
        "X": "SS",    // x 近似 sh
        "R": "RR",
        "Z": "SS",
        "C": "SS",
        "S": "SS",
        "Y": "",      // 作为零声母时处理
        "W": ""
    };
      
      this.CH_FINALS = {
        "IANG": "I aa nn",
        "UANG": "U aa nn",
        "IONG": "I O nn",
        "IAO": "I aa O",
        "IAN": "I aa nn",
        "UAN": "U aa nn",
        "ANG": "aa nn",
        "ENG": "E nn",
        "ING": "I nn",
        "ONG": "O nn",
        "AI": "aa I",
        "EI": "E I",
        "AO": "aa O",
        "OU": "O U",
        "ER": "E RR",
        "IA": "I aa",
        "IE": "I E",
        "IU": "I U",
        "UI": "U I",
        "UA": "U aa",
        "UO": "U O",
        "VE": "I",     // ü -> I
        "UE": "I E",   // üe -> I E
        "A": "aa",
        "O": "O",
        "E": "E",
        "I": "I",
        "U": "U",
        "V": "I",      // ü -> I
        "AN": "aa nn",
        "EN": "E nn",
        "IN": "I nn",
        "UN": "U nn"   // 可能需要额外区分 JUN=I nn
      };

    const ops = {
      '#': '[AEIOUY]+', // One or more vowels AEIOUY
      // This one is not used: "'": '[BCDFGHJKLMNPQRSTVWXZ]+', // One or more consonants BCDFGHJKLMNPQRSTVWXZ
      '.': '[BDVGJLMNRWZ]', // One voiced consonant BDVGJLMNRWZ
      // This one is not used: '$': '[BDVGJLMNRWZ][EI]', // One consonant followed by E or I
      '%': '(?:ER|E|ES|ED|ING|ELY)', // One of ER, E, ES, ED, ING, ELY
      '&': '(?:[SCGZXJ]|CH|SH)', // One of S, C, G, Z, X, J, CH, SH
      '@': '(?:[TSRDLZNJ]|TH|CH|SH)', // One of T, S, R, D, L, Z, N, J, TH, CH, SH
      '^': '[BCDFGHJKLMNPQRSTVWXZ]', // One consonant BCDFGHJKLMNPQRSTVWXZ
      '+': '[EIY]', // One of E, I, Y
      ':': '[BCDFGHJKLMNPQRSTVWXZ]*', // Zero or more consonants BCDFGHJKLMNPQRSTVWXZ
      ' ': '\\b', // Start/end of the word
      '~': '[A-Z]+' // 新增中文专用操作符表示多字母组合
    };

    // Convert rules to regex
    Object.keys(this.rules).forEach( key => {
      if(key.startsWith('CH_')) {
        this.rules[key] = this.rules[key].map( rule => {
          // 示例规则转换："[IAO] =I aa O" → 正则匹配IAO
          const posL = rule.indexOf('[');
          const posR = rule.indexOf(']');
          const posE = rule.indexOf('=');
          
          const chnPart = rule.substring(posL+1, posR);
          const visemes = rule.substring(posE+1).trim().split(' ');

          return {
            regex: new RegExp(`^${chnPart}`), // 匹配拼音开头
            move: chnPart.length,
            visemes: visemes
          };
        });
      } else {
        this.rules[key] = this.rules[key].map( rule => {
          const posL = rule.indexOf('[');
          const posR = rule.indexOf(']');
          const posE = rule.indexOf('=');
          const strLeft = rule.substring(0,posL);
          const strLetters = rule.substring(posL+1,posR);
          const strRight = rule.substring(posR+1,posE);
          const strVisemes = rule.substring(posE+1);

          const o = { regex: '', move: 0, visemes: [] };

          let exp = '';
          exp += [...strLeft].map( x => ops[x] || x ).join('');
          const ctxLetters = [...strLetters];
          ctxLetters[0] = ctxLetters[0].toLowerCase();
          exp += ctxLetters.join('');
          o.move = ctxLetters.length;
          exp += [...strRight].map( x => ops[x] || x ).join('');
          o.regex = new RegExp(exp);

          if ( strVisemes.length ) {
            strVisemes.split(' ').forEach( viseme => {
              o.visemes.push(viseme);
            });
          }

          return o;
        });
      }
    });

    this.duration_factor = 0.2; // 根据不同语音调整
    // Viseme durations in relative unit (1=average)
    // TODO: Check for statistics for English
    this.visemeDurations = {
      'aa': 0.95, 'E': 0.90, 'I': 0.92, 'O': 0.96, 'U': 0.95, 
      'PP': 1.08, 'SS': 1.23, 'TH': 1, 'DD': 1.05, 'FF': 1.00,
      'kk': 1.21, 'nn': 0.88, 'RR': 0.88, 'sil': 1,
      
      // 新增中文专用参数
      'a': 0.82,    // 短于英文aa
      'y': 0.78,    // ü音
      'zh': 1.05,   // 翘舌音延长
      'ch': 1.08,
      'sh': 1.06,
      'j': 0.95,    // 舌面音
      'q': 0.97,
      'x': 0.93
    };

    // Pauses in relative units (1=average)
    this.specialDurations = { 
      ' ': 0.8,    // 缩短音节间隔
      '，': 1.5,   // 中文逗号
      '。': 2.2,   // 中文句号
      '-': 0.3,      // 连字符缩短
      '！': 2.,
      '？': 2.,
      '：': 2.,
      '；': 1.8,
      '……': 2.5,
      '、': 1.5,
      
    };

    // English number words
    // this.digits = ['oh', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    // this.ones = ['','one','two','three','four','five','six','seven','eight','nine'];
    // this.tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
    // this.teens = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
    // convert to Chinese
    this.digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    this.ones = ['','一','二','三','四','五','六','七','八','九'];
    this.tens = ['','','二十','三十','四十','五十','六十','七十','八十','九十'];
    this.teens = ['十','十一','十二','十三','十四','十五','十六','十七','十八','十九'];

    // Symbols to English
    this.symbols = {
      '%': 'percent', '€': 'euros', '&': 'and', '+': 'plus',
      '$': 'dollars'
    };
    this.symbolsReg = /[%€&\+\$]/g;
    // 添加中文特殊符号处理
    this.ChineseSymbols = {
        '％': '百分之', '¥': '元', 
        // '《': ' ', '》': ' ', 
        '+': '加', '-': '减', '×': '乘', '÷': '除', '=': '等于',
    };
    this.ChineseNum = {
      '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六', '7': '七', '8': '八', '9': '九', '0': '零'
    }

    // 在构造函数中添加规则排序（确保最长匹配优先）
    // this.rules.CH_INITIALS.sort((a, b) => b.move - a.move);
    // this.rules.CH_FINALS.sort((a, b) => b.move - a.move);

    // 在构造函数中添加中文节奏参数 (unused)
    this.chineseRhythm = {
      initialShorten: 0.15,  // 声母缩短系数
      finalExtend: 0.1       // 韵母延长系数
    };
  }

  convert_digit_by_digit(num) {
    num = String(num).split("");
    let numWords = "";
    for(let m=0; m<num.length; m++) {
      numWords += this.digits[num[m]] + " ";
    }
    numWords = numWords.substring(0, numWords.length - 1); //kill final space
    return numWords;
  }

  convert_sets_of_two(num) {
    let firstNumHalf = String(num).substring(0, 2);
    let secondNumHalf = String(num).substring(2, 4);
    let numWords = this.convert_tens(firstNumHalf);
    numWords += " " + this.convert_tens(secondNumHalf);
    return numWords;
  }

  convert_millions(num){
    if (num>=1000000){
      return this.convert_millions(Math.floor(num/1000000))+" million "+this.convert_thousands(num%1000000);
    } else {
      return this.convert_thousands(num);
    }
  }

  convert_thousands(num){
    if (num>=1000){
      return this.convert_hundreds(Math.floor(num/1000))+" thousand "+this.convert_hundreds(num%1000);
    } else {
      return this.convert_hundreds(num);
    }
  }

  convert_hundreds(num){
    if (num>99){
      return this.ones[Math.floor(num/100)]+" hundred "+this.convert_tens(num%100);
    } else {
      return this.convert_tens(num);
    }
  }

  convert_tens(num){
    if (num < 10){
      return (Number(num) != 0 && num.toString().startsWith("0") ? "oh " : "") + this.ones[Number(num)];
    } else if (num>=10 && num<20) {
      return this.teens[num-10];
    } else {
      return this.tens[Math.floor(num/10)]+" "+this.ones[num%10];
    }
  }
 
  convertNumberToWords(num){
    if(num == "0"){
      return "zero";
    } else if(num.startsWith('0')){
      return this.convert_digit_by_digit(num);
    } else if ((num<1000&&num>99)||(num>10000&&num<1000000)) { //read area and zip codes digit by digit
      return this.convert_digit_by_digit(num);
    } else if ((num > 1000 && num < 2000)||(num>2009&&num<3000)) { //read years as two sets of two digits
      return (num % 100 != 0 ? this.convert_sets_of_two(num) : this.convert_tens(num.substring(0, 2)) + " hundred");
    } else {
      return this.convert_millions(num);
    }
  }

  /**
  * Preprocess text:
  * - convert symbols to words
  * - convert numbers to words
  * - filter out characters that should be left unspoken
  * @param {string} s Text
  * @return {string} Pre-processsed text.
  */
  preProcessText(s) {

    if (this.containsChinese(s)) {
      return this.preProcessChineseText(s.replace(/\s+/g, '')); // .replace(/\s+/g, '')
    }

    return s.replace(/[#_*\":;]/g,'')
      .replace( this.symbolsReg, (symbol) => {
        return ' ' + this.symbols[symbol] + ' ';
      })
      .replace(/(\d)\.(\d)/g, '$1 point $2') // Number separator
      .replace(/\d+/g, this.convertNumberToWords.bind(this)) // Numbers to words
      .replace(/(\D)\1\1+/g, "$1$1") // max 2 repeating chars
      .replaceAll('  ',' ') // Only one repeating space
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC') // Remove non-English diacritics
      .trim();
  }

  // 添加中文预处理方法，经过wordsToVisemes前已做过一次
  preProcessChineseText(s) {
    // 定义中文标点符号正则表达式
    const chnSymbolsReg = new RegExp(`[${Object.keys(this.ChineseSymbols).join('')}]`, 'g');
    
    return s.replace(chnSymbolsReg, (symbol) => {
        // 将特殊符号替换为对应的中文词汇
        return this.ChineseSymbols.hasOwnProperty(symbol) ? this.ChineseSymbols[symbol] : symbol;
      })
      // TODO: 后面判定数字的时候处理一下小数点
      // .replace(/(\d)\.(\d)/g, '$1点$2')  // 处理中文数字的小数点
      .replace(/(\d)\.\s*([\u4e00-\u9fa5])/g, '$1、$2') // 非数字意义的点号
      .replace(/([\u4e00-\u9fa5])(\d)\.\s*([\u4e00-\u9fa5])/g, '$1；$2、$3') // 非数字意义的点号
      .replace(/(\D)\1\1+/g, "$1$1")     // 最多保留2个重复字符
      .replace(/[#_*\":;]/g, '')         // 过滤特殊字符
      .replaceAll('  ',' ')              // 合并多个空格
      .trim(); // 处理了分点问题
      // TODO: 处理数字符号的中文
  }

  /**
 * 去除汉字串中的标点符号并记录位置
 * @param {string} text 输入的中文文本
 * @return {Object} 包含去除标点后的文本和标点位置信息
 */
  removePunctuation(text) {
    // 定义中文标点符号正则表达式
    const punctRegex = /[，。！？：；""''（）【】《》——…、]/g;
    // const punctRegex = /[，。！？：；——…、]/g;
    
    // 存储结果
    const result = {
      cleanText: '',  // 去除标点后的文本
      punctuations: [] // 标点符号位置信息
    };
    
    // 记录原始位置和清理后位置的映射
    let cleanIndex = 0;
    
    // 查找所有标点符号
    let match;
    while ((match = punctRegex.exec(text)) !== null) {
      const punc = match[0];
      const originalIndex = match.index;
      
      // 记录标点信息
      result.punctuations.push({
        type: punc,
        originalIndex: originalIndex,
        cleanIndex: cleanIndex > 0 ? cleanIndex - 1 : 0, // 对应的清理后位置
        duration: (this.specialDurations[punc] || 1.0) * Math.min(this.duration_factor * 2, 1) // 使用已有的持续时间配置
      });
    }
    
    // 去除标点符号
    result.cleanText = text.replace(punctRegex, '');
    
    return result;
  }

  /**
  * Convert word to Oculus LipSync Visemes and durations
  * @param {string} w Text
  * @return {Object} Oculus LipSync Visemes and durations.
  */

  chineseToVisemes(w) {
    let o = { 
      words: w,
      visemes: [],
      times: [],
      durations: [],
      i: 0 
    };
    let t = 0;

    const Index = this.removePunctuation(o.words);
    const Initials = pinyin(Index.cleanText, {pattern: 'initial', toneType: 'none', type: 'array'})
    const Finals = pinyin(Index.cleanText, {pattern: 'final', toneType: 'none', v: true, type: 'array'})

    // Initials.forEach(py => {py.toUpperCase()})
    // Finals.forEach(py => {py.toUpperCase()})

    let temp = 1;
    
    while(o.i < Initials.length) {
      let c = Initials[o.i].toUpperCase();

      let viseme = this.CH_INITIALS[c];
      let d = (this.visemeDurations[viseme] || 1) * this.duration_factor; // * 0.7 ?
      o.visemes.push(viseme);
      o.times.push(t);
      o.durations.push(d);
      t += d;

      c = Finals[o.i].toUpperCase();
      viseme = this.CH_FINALS[c];
      d = (this.visemeDurations[viseme] || 1) * this.duration_factor;
      o.visemes.push(viseme);
      o.times.push(t);
      o.durations.push(d);
      t += d;

      let punc_id = 0;
      while(punc_id < Index.punctuations.length) {
        if(Index.punctuations[punc_id].originalIndex === o.i+temp) {
          temp++;
          t += (this.specialDurations[Index.punctuations[punc_id].type] || 1) * Math.min(this.duration_factor * 2, 1);
          break;
        }
        punc_id++;
      }
      o.i++;
      
    }
    return o;
  }
  // 公共的视素应用方法
  applyVisemes(o, t, visemes) {
    visemes.forEach(viseme => {
      if (o.visemes.length && o.visemes[o.visemes.length - 1] === viseme) {
        const d = 0.7 * (this.visemeDurations[viseme] || 1) * this.duration_factor;
        o.durations[o.durations.length - 1] += d;
        t += d;
      } else {
        const d = (this.visemeDurations[viseme] || 1) * this.duration_factor;
        o.visemes.push(viseme);
        o.times.push(t);
        o.durations.push(d);
        t += d;
      }
    });
  }
  wordsToVisemes(w) {
    // 检查是否包含中文
    if (this.containsChinese(w)) {
        return this.chineseToVisemes(w);
    }
    
    // 处理英文
    let o = { words: w.toUpperCase(), visemes: [], times: [], durations: [], i: 0 };
    let t = 0;

    const chars = [...o.words];
    while (o.i < chars.length) {
      const c = chars[o.i];
      const ruleset = this.rules[c];
      if (ruleset) {
        for (let i = 0; i < ruleset.length; i++) {
          const rule = ruleset[i];
          const test = o.words.substring(0, o.i) + c.toLowerCase() + o.words.substring(o.i + 1);
          let matches = test.match(rule.regex);
          if (matches) {
            rule.visemes.forEach(viseme => {
              if (o.visemes.length && o.visemes[o.visemes.length - 1] === viseme) {
                const d = 0.7 * (this.visemeDurations[viseme] || 1) * this.duration_factor;
                o.durations[o.durations.length - 1] += d;
                t += d;
              } else {
                const d = (this.visemeDurations[viseme] || 1) * this.duration_factor;
                o.visemes.push(viseme);
                o.times.push(t);
                o.durations.push(d);
                t += d;
              }
            });
            o.i += rule.move;
            break;
          }
        }
      } else {
        o.i++;
        t += (this.specialDurations[c] || 0) * Math.min(this.duration_factor * 2, 1);
      }
    }

    return o;
  }

  // 添加中文检测方法（正确语法）
  containsChinese(text) {
    return /[\u4e00-\u9fa5]/.test(text);
  }

}

export { LipsyncZh };
