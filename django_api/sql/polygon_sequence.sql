select as2.id, br.abbreviation , as2.annotation_type , as2.FK_brain_region_id , ps.x, ps.y, ps.z
from polygon_sequences ps 
inner join annotation_session as2 on ps.FK_session_id = as2.id
inner join brain_region br on as2.FK_brain_region_id = br.id 
where as2.FK_prep_id = 'DK109'

and as2.active = 1
and as2.FK_user_id = 1;

update polygon_sequences set x = x/32, y=y/32 where FK_session_id = 7773;

select s.id, s.FK_scan_run_id , s.slide_physical_id , s.slide_status, s.file_name, st.file_name 
from slide s  
inner join slide_czi_to_tif st on s.id = st.FK_slide_id 
where st.FK_slide_id in (10978,10980)
and st.file_name = 'DK132_slide015_2024_01_17_axion2_S1_C1.tif'
and st.channel = 1;

select section, rotation, xshift, yshift, created
FROM elastix_transformation WHERE FK_prep_id = 'DK132' AND SECTION in ('060','061');
-- 060	-0.412586	-224.155	20.6463	2024-02-14 02:26:28.000
-- 061	0.0472374	40.922	47.0392	2024-02-13 20:29:54.000
DELETE FROM elastix_transformation WHERE FK_prep_id = 'DK132' AND SECTION in ('060','061');