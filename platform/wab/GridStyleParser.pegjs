trackTemplate = first:size rest:( __ size )* {
  return [{size: first}, ...rest.map(x => ({size: x[1]}))];
}

size = minMaxSize / atomicSize
atomicSize = keywordSize / numSize

minMaxSize = 'minmax' _ '(' _ min:size _ ',' _ max:size _ ')' {
  return { type: "MinMaxSize", min, max };
}

keywordSize = 'auto' {
  return { type: "KeywordSize", value: "auto" };
}

numSize = num:num unit:unit {
  return { type: "NumericSize", num, unit };
}

flexibleSize = 'repeat(auto-fill, minmax(' _ size:numSize _ ', 1fr))' {
  return { type: "FlexibleSize", size };
}

fixedSize = 'repeat(' _ num:num _ ', minmax(0, 1fr))' {
  return { type: "FixedSize", num }
}

axisTemplate = flexibleSize / trackTemplate / fixedSize

num = [0-9]+ ( '.' [0-9]+ )? { return +text(); }
unit = 'px' / '%' / 'fr' / 'em' / 'vw' / 'vh' / 'ch' / 'cm' / 'ex' / 'in' / 'mm' / 'pc' / 'pt' / 'vmax' / 'vmin' / 'rem'

__ = [ \t\r\n]+
_ = [ \t\r\n]*