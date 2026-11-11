update public.products
set
  sizes = array['XS','S','M','L','XL','XXL'],
  size_chart = jsonb_build_object(
    'cols', jsonb_build_array('Beden', 'Göğüs', 'Uzunluk', 'Omuz omuza', 'Kol uzunluğu'),
    'notes', jsonb_build_array(
      'Ölçümün her iki tarafında 1 cm''lik bir tolerans bırakın.',
      'Göğüs ölçüsü koltuk altından 2,5 cm aşağıdan alınır.'
    ),
    'rows', jsonb_build_array(
      jsonb_build_object('size', 'XS', 'cells', jsonb_build_array('69', '60,5', '65', '51,5')),
      jsonb_build_object('size', 'S', 'cells', jsonb_build_array('71', '63,5', '67', '52,5')),
      jsonb_build_object('size', 'M', 'cells', jsonb_build_array('73', '66,5', '69', '53,5')),
      jsonb_build_object('size', 'L', 'cells', jsonb_build_array('75', '69,5', '71', '54,5')),
      jsonb_build_object('size', 'XL', 'cells', jsonb_build_array('77', '72,5', '73', '55,5')),
      jsonb_build_object('size', 'XXL', 'cells', jsonb_build_array('79', '75,5', '75', '56,5'))
    )
  )
where id = 'hoodie';

update public.products
set
  sizes = array['XS','S','M','L','XL','XXL'],
  size_chart = jsonb_build_object(
    'cols', jsonb_build_array('Beden', 'Göğüs', 'Uzunluk', 'Kol uzunluğu'),
    'notes', jsonb_build_array(
      'Ölçümün her iki tarafında 1 cm''lik bir tolerans bırakın.',
      'Göğüs ölçüsü koltuk altından 2,5 cm aşağıdan alınır.'
    ),
    'rows', jsonb_build_array(
      jsonb_build_object('size', 'XS', 'cells', jsonb_build_array('53,8', '68', '19,5')),
      jsonb_build_object('size', 'S', 'cells', jsonb_build_array('61', '71,5', '19,5')),
      jsonb_build_object('size', 'M', 'cells', jsonb_build_array('62,2', '73', '21,5')),
      jsonb_build_object('size', 'L', 'cells', jsonb_build_array('63,5', '75', '22')),
      jsonb_build_object('size', 'XL', 'cells', jsonb_build_array('64,8', '76', '22')),
      jsonb_build_object('size', 'XXL', 'cells', jsonb_build_array('66', '78', '22'))
    )
  )
where id in ('tee', 'tote');

update public.products
set
  sizes = array['XS','S','M','L','XL','XXL'],
  size_chart = jsonb_build_object(
    'cols', jsonb_build_array('Beden', 'Bel', 'Uyluk genişliği', 'İç bacak', 'Ön yükseliş'),
    'notes', jsonb_build_array(
      'Ölçümün her iki tarafında 2,5 cm''lik bir tolerans bırakın.',
      'Kumaş yapısı gereği bu ürün bol kesimlidir. İki beden arasında kalırsanız bir beden küçük alın.',
      'Uyluk ölçüsü kasık hizasından 2,5 cm aşağıdan alınır.'
    ),
    'rows', jsonb_build_array(
      jsonb_build_object('size', 'XS', 'cells', jsonb_build_array('26-28*', '32', '78,50', '24,25')),
      jsonb_build_object('size', 'S', 'cells', jsonb_build_array('28-30*', '33,50', '79,50', '25,50')),
      jsonb_build_object('size', 'M', 'cells', jsonb_build_array('30-32*', '35', '80,50', '26,75')),
      jsonb_build_object('size', 'L', 'cells', jsonb_build_array('32-34*', '36,5', '81,50', '28')),
      jsonb_build_object('size', 'XL', 'cells', jsonb_build_array('34-36*', '38', '82,50', '29,25')),
      jsonb_build_object('size', 'XXL', 'cells', jsonb_build_array('36-38*', '39,50', '83,50', '30,50'))
    )
  )
where id = 'sweat';
